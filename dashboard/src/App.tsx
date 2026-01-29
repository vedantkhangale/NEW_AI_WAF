import { useEffect, useState } from 'react';
import { Shield, BarChart3, Activity, FileCode, Brain, Settings, AlertTriangle } from 'lucide-react';
import GlobalAttackMap from './components/GlobalAttackMap';
import TopAttackingIPs from './components/TopAttackingIPs';
import RecentEvents from './components/RecentEvents';
import EventsLog from './components/EventsLog';
import Analytics from './components/Analytics';
import Sidebar from './components/Sidebar';
import { initializeWebSocket, closeWebSocket } from './store/useSocketStore';

interface Stats {
    total_requests: number;
    blocked: number;
    allowed: number;
    block_rate: number;
    high_severity: number;
}

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
        // Initialize WebSocket for real-time updates
        initializeWebSocket();

        // Listen for navigation events from sidebar
        const handleNavigation = (event: CustomEvent) => {
            setCurrentView(event.detail.view);
        };

        window.addEventListener('navigate', handleNavigation as EventListener);

        // Fetch real stats from API
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
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {currentView === 'overview' && (
                    <>
                        {/* Top Stats Bar */}
                        <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
                            <div className="grid grid-cols-5 gap-4">
                                {/* Total Requests */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg blur group-hover:blur-md transition-all"></div>
                                    <div className="relative bg-slate-800/90 border border-blue-500/30 rounded-lg p-4 hover:border-blue-400/50 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <Activity className="w-5 h-5 text-blue-400" />
                                            <span className="text-2xl font-bold text-blue-400">
                                                {loading ? '...' : stats.total_requests.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Total Requests</p>
                                    </div>
                                </div>

                                {/* Blocked */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg blur group-hover:blur-md transition-all"></div>
                                    <div className="relative bg-slate-800/90 border border-red-500/30 rounded-lg p-4 hover:border-red-400/50 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <Shield className="w-5 h-5 text-red-400" />
                                            <span className="text-2xl font-bold text-red-400">
                                                {loading ? '...' : stats.blocked.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Blocked</p>
                                    </div>
                                </div>

                                {/* Allowed */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg blur group-hover:blur-md transition-all"></div>
                                    <div className="relative bg-slate-800/90 border border-green-500/30 rounded-lg p-4 hover:border-green-400/50 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <Activity className="w-5 h-5 text-green-400" />
                                            <span className="text-2xl font-bold text-green-400">
                                                {loading ? '...' : stats.allowed.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Allowed</p>
                                    </div>
                                </div>

                                {/* Block Rate */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-lg blur group-hover:blur-md transition-all"></div>
                                    <div className="relative bg-slate-800/90 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400/50 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <BarChart3 className="w-5 h-5 text-purple-400" />
                                            <span className="text-2xl font-bold text-purple-400">
                                                {loading ? '...' : `${stats.block_rate}%`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Block Rate</p>
                                    </div>
                                </div>

                                {/* High Severity */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg blur group-hover:blur-md transition-all"></div>
                                    <div className="relative bg-slate-800/90 border border-orange-500/30 rounded-lg p-4 hover:border-orange-400/50 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                                            <span className="text-2xl font-bold text-orange-400">
                                                {loading ? '...' : stats.high_severity.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">High Severity</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Global Attack Map */}
                            <GlobalAttackMap />

                            {/* Bottom Grid - Top IPs and Recent Events */}
                            <div className="grid grid-cols-2 gap-6">
                                <TopAttackingIPs />
                                <RecentEvents />
                            </div>
                        </div>
                    </>
                )}

                {/* Other Views */}
                {currentView === 'analytics' && <Analytics />}

                {currentView === 'events' && <EventsLog />}

                {currentView === 'rules' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <FileCode className="w-24 h-24 text-purple-400 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-bold mb-2">⚙️ Rules Manager</h2>
                            <p className="text-gray-400">WAF rules configuration coming soon...</p>
                        </div>
                    </div>
                )}

                {currentView === 'training' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Brain className="w-24 h-24 text-pink-400 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-bold mb-2">🧠 AI Training</h2>
                            <p className="text-gray-400">False positive review coming soon...</p>
                        </div>
                    </div>
                )}

                {currentView === 'settings' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Settings className="w-24 h-24 text-gray-400 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-bold mb-2">💾 Settings</h2>
                            <p className="text-gray-400">System settings coming soon...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
