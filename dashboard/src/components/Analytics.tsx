import { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Shield, Activity, TrendingUp, AlertOctagon, Ban } from 'lucide-react';
import { useSocketStore } from '../store/useSocketStore';
import { format } from 'date-fns';

export default function Analytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [manualIp, setManualIp] = useState('');
    const [blockStatus, setBlockStatus] = useState<string | null>(null);
    const { events } = useSocketStore();

    // Get blocked IPs from events
    const blockedEvents = events.filter(e => e.action === 'BLOCK');

    const handleManualBlock = async () => {
        if (!manualIp) return;

        try {
            const res = await fetch('http://localhost:5000/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: manualIp })
            });

            if (res.ok) {
                setBlockStatus(`Success: ${manualIp} blocked`);
                setManualIp('');
                setTimeout(() => setBlockStatus(null), 3000);
            } else {
                setBlockStatus('Error: Failed to block IP');
            }
        } catch (error) {
            console.error(error);
            setBlockStatus('Error: Server unreachable');
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();

            setData({ stats });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
            setLoading(false);
        }
    };

    // Calculate real-time metrics from events
    const calculateHourlyData = () => {
        const hourlyMap = new Map<number, { requests: number; blocked: number }>();

        // Initialize last 24 hours
        for (let i = 0; i < 24; i++) {
            hourlyMap.set(i, { requests: 0, blocked: 0 });
        }

        // Count events per hour
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            const current = hourlyMap.get(hour) || { requests: 0, blocked: 0 };
            current.requests++;
            if (event.action === 'BLOCK') {
                current.blocked++;
            }
            hourlyMap.set(hour, current);
        });

        return Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            requests: hourlyMap.get(i)?.requests || 0,
            blocked: hourlyMap.get(i)?.blocked || 0,
        }));
    };

    const calculateAttackDistribution = () => {
        const attackMap = new Map<string, number>();

        events.filter(e => e.action === 'BLOCK' && e.attack_type).forEach(event => {
            const type = event.attack_type || 'Other';
            attackMap.set(type, (attackMap.get(type) || 0) + 1);
        });

        const total = Array.from(attackMap.values()).reduce((a, b) => a + b, 0) || 1;

        return Array.from(attackMap.entries()).map(([name, count]) => ({
            name,
            value: Math.round((count / total) * 100)
        }));
    };

    const calculateMetrics = () => {
        if (events.length === 0) return { peakRPM: 0, avgLatency: 0, falsePositiveRate: 0 };

        // Calculate peak requests per minute
        const minuteMap = new Map<string, number>();
        events.forEach(event => {
            const minute = event.timestamp.substring(0, 16); // YYYY-MM-DDTHH:MM
            minuteMap.set(minute, (minuteMap.get(minute) || 0) + 1);
        });
        const peakRPM = Math.max(...Array.from(minuteMap.values()), 0);

        // Calculate average latency (if available in events)
        const latencies = events.filter(e => e.latency_ms).map(e => e.latency_ms || 0);
        const avgLatency = latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 0;

        // Calculate false positive rate (PENDING / total requests)
        const pendingCount = events.filter(e => e.action === 'FLAG').length;
        const falsePositiveRate = events.length > 0
            ? ((pendingCount / events.length) * 100).toFixed(2)
            : '0.00';

        return { peakRPM, avgLatency, falsePositiveRate };
    };

    const historyData = calculateHourlyData();
    const attacksData = calculateAttackDistribution();
    const metrics = calculateMetrics();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (loading || !data) {
        return <div className="p-8 text-center text-slate-400 animate-pulse">Loading analytics data...</div>;
    }

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#64748b'];

    return (
        <div className="p-6 space-y-6 bg-slate-950/50 min-h-screen text-slate-100 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-400" />
                        Traffic Analytics (24h)
                    </h2>
                    <p className="text-slate-400">Deep dive into threat patterns and traffic analysis</p>
                </div>
            </div>

            {/* Traffic Overview Chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    Request Volume vs Blocked Threats
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                            <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" name="Total Requests" />
                            <Area type="monotone" dataKey="blocked" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" name="Blocked Threats" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Attack Types Distribution */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <AlertOctagon className="h-5 w-5 text-red-400" />
                        Attack Vector Distribution
                    </h3>
                    {attacksData.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-slate-500">
                            No attack data yet
                        </div>
                    ) : (
                        <div className="h-[250px] w-full flex items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attacksData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {attacksData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 text-sm text-slate-300">
                                {attacksData.map((entry: any, index: number) => (
                                    <div key={entry.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span>{entry.name}: {entry.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Manual Actions Card */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Manual IP Block
                        </h3>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Enter IP Address (e.g. 192.168.1.5)"
                                className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                value={manualIp}
                                onChange={(e) => setManualIp(e.target.value)}
                            />
                            <button
                                onClick={handleManualBlock}
                                disabled={!manualIp}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded py-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                PERMANENTLY BLOCK IP
                            </button>
                            {blockStatus && (
                                <p className={`text-xs text-center ${blockStatus.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                                    {blockStatus}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-center">
                        <p className="text-slate-400 text-sm mb-1">Peak Traffic (Real-Time)</p>
                        <h4 className="text-3xl font-bold text-blue-400">{metrics.peakRPM} RPM</h4>
                        <p className="text-xs text-slate-500 mt-2">
                            Based on {events.length} requests
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-center">
                        <p className="text-slate-400 text-sm mb-1">Average Latency</p>
                        <h4 className="text-3xl font-bold text-purple-400">{metrics.avgLatency}ms</h4>
                        <p className="text-xs text-slate-500 mt-2">
                            WAF Processing Time
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-center">
                        <p className="text-slate-400 text-sm mb-1">Pending Review Rate</p>
                        <h4 className="text-3xl font-bold text-green-400">{metrics.falsePositiveRate}%</h4>
                        <p className="text-xs text-slate-500 mt-2">
                            Based on {events.length} requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Blocked IPs Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-400" />
                    Blocked IP Addresses ({blockedEvents.length})
                </h3>

                {blockedEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No blocked IPs yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">IP Address</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Country</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Attack Type</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Risk Score</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blockedEvents.slice(0, 50).map((event) => (
                                    <tr
                                        key={event.id}
                                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <span className="font-mono text-sm text-red-400">{event.source_ip}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{event.country || 'Unknown'}</span>
                                                {event.geo_city && (
                                                    <span className="text-xs text-slate-500">({event.geo_city})</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                {event.attack_type || 'Suspicious'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${event.risk_score > 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${event.risk_score}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-slate-400">{Math.round(event.risk_score)}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-slate-500 font-mono">
                                                {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {blockedEvents.length > 50 && (
                            <div className="text-center mt-4 text-sm text-slate-500">
                                Showing 50 of {blockedEvents.length} blocked IPs
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
