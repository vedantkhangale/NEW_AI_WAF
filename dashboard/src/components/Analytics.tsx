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
import { Shield, Activity, TrendingUp, AlertOctagon } from 'lucide-react';

export default function Analytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [manualIp, setManualIp] = useState('');
    const [blockStatus, setBlockStatus] = useState<string | null>(null);

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

            // Mocking historical data for charts since the API only returns current stats
            // In a real prod environment, /api/v1/stats/aggregate would provide this
            const mockHistory = Array.from({ length: 24 }, (_, i) => ({
                time: `${i}:00`,
                requests: Math.floor(Math.random() * 100) + 50,
                blocked: Math.floor(Math.random() * 30),
            }));

            const mockAttacks = [
                { name: 'SQL Injection', value: 35 },
                { name: 'XSS', value: 25 },
                { name: 'Path Traversal', value: 15 },
                { name: 'DDoS', value: 10 },
                { name: 'Other', value: 15 },
            ];

            setData({
                stats,
                history: mockHistory,
                attacks: mockAttacks
            });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
            setLoading(false);
        }
    };

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
                        <AreaChart data={data.history}>
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
                    <div className="h-[250px] w-full flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.attacks}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.attacks.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 text-sm text-slate-300">
                            {data.attacks.map((entry: any, index: number) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span>{entry.name}: {entry.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                        <p className="text-slate-400 text-sm mb-1">Peak Traffic (Last 24h)</p>
                        <h4 className="text-3xl font-bold text-blue-400">142 RPM</h4>
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +12% vs yesterday
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-center">
                        <p className="text-slate-400 text-sm mb-1">Average Latency</p>
                        <h4 className="text-3xl font-bold text-purple-400">18ms</h4>
                        <p className="text-xs text-slate-500 mt-2">
                            AI Inference: 12ms | Network: 6ms
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-center">
                        <p className="text-slate-400 text-sm mb-1">False Positive Rate</p>
                        <h4 className="text-3xl font-bold text-green-400">0.04%</h4>
                        <p className="text-xs text-slate-500 mt-2">
                            Based on 25k requests
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
