import { useEffect, useState } from 'react';
import { Shield, BarChart3, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import GlobalAttackMap from './components/GlobalAttackMap';
import TopAttackingIPs from './components/TopAttackingIPs';
import RecentEvents from './components/RecentEvents';
import EventsLog from './components/EventsLog';
import RulesManager from './components/RulesManager';
import FalsePositiveReview from './components/FalsePositiveReview';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import { initializeWebSocket, closeWebSocket, useSocketStore } from './store/useSocketStore';

interface Stats {
    total_requests: number;
    blocked: number;
    allowed: number;
    block_rate: number;
    high_severity: number;
}

// ─── Analytics Tab Layout ────────────────────────────────────────────────────
function AnalyticsView() {
    const { events } = useSocketStore();

    // Real high-severity events from socket store
    const highSeverityEvents = events
        .filter(e => e.action === 'BLOCK' && (e.risk_score ?? 0) >= 70)
        .slice(0, 8);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Real-Time Global Attack Map */}
            <div>
                <div className="flex items-center space-x-2 mb-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <h2 className="text-lg font-bold text-white">Live Global Attack Map</h2>
                    <span className="text-xs text-gray-400">— Real-time GeoIP from WAF Engine</span>
                </div>
                <GlobalAttackMap />
            </div>

            {/* Two-column: Top IPs + High Severity */}
            <div className="grid grid-cols-2 gap-6">
                <TopAttackingIPs />

                {/* Recent High-Severity Events */}
                <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center space-x-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                        <h3 className="text-xl font-bold">Recent High-Severity Events</h3>
                        <div className="ml-auto w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {highSeverityEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Shield className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm">No high-severity attacks yet</p>
                                <p className="text-xs mt-1">Launch attacks from the simulator to see events here</p>
                            </div>
                        ) : (
                            highSeverityEvents.map((event, i) => (
                                <div key={event.id ?? i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono text-xs text-blue-400 truncate">{event.source_ip}</span>
                                            <span className="text-xs text-gray-500">{event.country}</span>
                                        </div>
                                        <p className="text-xs text-red-300 mt-0.5 truncate">{event.attack_type || event.uri}</p>
                                    </div>
                                    <div className="ml-3 text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-red-400">
                                            {Math.round((event.risk_score ?? 0) * 100)}%
                                        </span>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Events (live)', value: events.length, color: 'blue', icon: Activity },
                    { label: 'Blocked (live)', value: events.filter(e => e.action === 'BLOCK').length, color: 'red', icon: Shield },
                    { label: 'High Severity (live)', value: highSeverityEvents.length, color: 'orange', icon: TrendingUp },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className={`bg-slate-800/80 border border-${color}-500/30 rounded-xl p-4 flex items-center space-x-4`}>
                        <Icon className={`w-8 h-8 text-${color}-400`} />
                        <div>
                            <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
                            <p className="text-xs text-gray-400">{label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
    const [currentView, setCurrentView] = useState('overview');
    const [stats, setStats] = useState<Stats>({
        total_requests: 0,
        blocked: 0,
        allowed: 0,
        block_rate: 0,
        high_severity: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeWebSocket();

        const handleNavigation = (event: CustomEvent) => {
            setCurrentView(event.detail.view);
        };

        window.addEventListener('navigate', handleNavigation as EventListener);
        fetchStats();
        const interval = setInterval(fetchStats, 3000);

        return () => {
            window.removeEventListener('navigate', handleNavigation as EventListener);
            clearInterval(interval);
            closeWebSocket();
        };
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── OVERVIEW ── */}
                {currentView === 'overview' && (
                    <>
                        {/* Stats Bar */}
                        <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
                            <div className="grid grid-cols-5 gap-4">
                                {[
                                    { label: 'Total Requests', value: stats.total_requests, color: 'blue', Icon: Activity },
                                    { label: 'Blocked', value: stats.blocked, color: 'red', Icon: Shield },
                                    { label: 'Allowed', value: stats.allowed, color: 'green', Icon: Activity },
                                    { label: 'Block Rate', value: `${stats.block_rate}%`, color: 'purple', Icon: BarChart3 },
                                    { label: 'High Severity', value: stats.high_severity, color: 'orange', Icon: AlertTriangle },
                                ].map(({ label, value, color, Icon }) => (
                                    <div key={label} className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500/20 to-${color}-600/20 rounded-lg blur group-hover:blur-md transition-all`} />
                                        <div className={`relative bg-slate-800/90 border border-${color}-500/30 rounded-lg p-4 hover:border-${color}-400/50 transition-all`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <Icon className={`w-5 h-5 text-${color}-400`} />
                                                <span className={`text-2xl font-bold text-${color}-400`}>
                                                    {loading ? '...' : typeof value === 'number' ? value.toLocaleString() : value}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium">{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <GlobalAttackMap />
                            <div className="grid grid-cols-2 gap-6">
                                <TopAttackingIPs />
                                <RecentEvents />
                            </div>
                        </div>
                    </>
                )}

                {/* ── ANALYTICS ── */}
                {currentView === 'analytics' && <AnalyticsView />}

                {/* ── EVENTS ── */}
                {currentView === 'events' && <EventsLog />}

                {/* ── RULES ── */}
                {currentView === 'rules' && (
                    <div className="flex-1 overflow-y-auto">
                        <RulesManager />
                    </div>
                )}

                {/* ── FALSE POSITIVES / AI TRAINING ── */}
                {currentView === 'training' && (
                    <div className="flex-1 overflow-y-auto">
                        <FalsePositiveReview />
                    </div>
                )}

                {/* ── SETTINGS ── */}
                {currentView === 'settings' && (
                    <div className="flex-1 overflow-y-auto">
                        <SettingsPanel />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
