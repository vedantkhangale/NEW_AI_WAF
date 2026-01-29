import { useState, useEffect } from 'react';
import {
    AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Clock, Activity, Shield, TrendingUp } from 'lucide-react';

interface AggregateStats {
    time_range: string;
    summary: {
        total_requests: number;
        blocked_requests: number;
        allowed_requests: number;
        avg_latency: number;
        max_latency: number;
        unique_ips: number;
    };
    traffic_volume: Array<{
        time: string;
        total_requests: number;
        blocked_requests: number;
        allowed_requests: number;
    }>;
    latency_data: Array<{
        time: string;
        avg_latency: number;
        max_latency: number;
    }>;
    attack_distribution: Array<{
        attack_type: string;
        count: number;
    }>;
}

const TIME_RANGES = [
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
];

export default function AnalyticsTab() {
    const [timeRange, setTimeRange] = useState('1h');
    const [stats, setStats] = useState<AggregateStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/v1/stats/aggregate?range=${timeRange}`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [timeRange]);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading analytics...</div>
            </div>
        );
    }

    // Format traffic volume data
    const trafficData = stats.traffic_volume.map(item => ({
        time: new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        total: item.total_requests,
        blocked: item.blocked_requests,
    }));

    // Format latency data
    const latencyData = stats.latency_data.map(item => ({
        time: new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        latency: Math.round(item.avg_latency),
    }));

    // Format attack radar data
    const radarData = stats.attack_distribution.map(item => ({
        attack: item.attack_type,
        count: item.count,
    }));

    return (
        <div className="p-6 space-y-6">
            {/* Header with Time Range Filters */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <div className="flex space-x-2">
                    {TIME_RANGES.map(range => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`px-4 py-2 rounded-lg transition-all ${timeRange === range.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <Activity className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-400">Total Requests</p>
                            <p className="text-2xl font-bold">{stats.summary.total_requests || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <Shield className="w-8 h-8 text-red-500" />
                        <div>
                            <p className="text-sm text-gray-400">Blocked</p>
                            <p className="text-2xl font-bold text-red-500">{stats.summary.blocked_requests || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <Clock className="w-8 h-8 text-yellow-500" />
                        <div>
                            <p className="text-sm text-gray-400">Avg Latency</p>
                            <p className="text-2xl font-bold">{Math.round(stats.summary.avg_latency || 0)}ms</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-sm text-gray-400">Unique IPs</p>
                            <p className="text-2xl font-bold">{stats.summary.unique_ips || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Traffic Volume Chart */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Traffic Volume</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trafficData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#10b981"
                                fill="url(#colorTotal)"
                                name="Total Requests"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="blocked"
                                stroke="#ef4444"
                                fill="url(#colorBlocked)"
                                name="Blocked Requests"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Latency Monitor */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Latency Monitor</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={latencyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label="Threshold" />
                            <Line
                                type="monotone"
                                dataKey="latency"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 3 }}
                                name="Processing Time (ms)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Attack Vector Radar */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 col-span-2">
                    <h3 className="text-lg font-bold mb-4">Attack Vector Distribution</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#374151" />
                            <PolarAngleAxis dataKey="attack" stroke="#6b7280" />
                            <PolarRadiusAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Radar
                                name="Attack Count"
                                dataKey="count"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.6}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
