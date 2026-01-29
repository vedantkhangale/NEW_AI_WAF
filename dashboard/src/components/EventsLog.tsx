import { useEffect, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import { useSocketStore } from '../store/useSocketStore';

interface RequestLog {
    id: number;
    timestamp: string;
    source_ip: string;
    method: string;
    uri: string;
    geo_country: string;
    action: string;
    risk_score: number;
    attack_type: string;
    headers?: string; // JSON string
    full_body?: string;
    risk_factors?: string; // JSON string
}

export default function EventsLog() {
    const [logs, setLogs] = useState<RequestLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const { setSelectedEvent } = useSocketStore();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (filter !== 'ALL') params.append('action', filter);

            const response = await fetch(`/api/requests?${params}`);
            const data = await response.json();
            setLogs(data.requests);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Auto-refresh every 5s
        return () => clearInterval(interval);
    }, [filter]);

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'BLOCKED': return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-red-500/20 text-red-400 ring-red-500/30">BLOCKED</span>;
            case 'ALLOWED': return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-green-500/20 text-green-400 ring-green-500/30">ALLOWED</span>;
            case 'PENDING': return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-yellow-500/20 text-yellow-400 ring-yellow-500/30">PENDING</span>;
            default: return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-slate-400/10 text-slate-400 ring-slate-400/20">{action}</span>;
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 0.8) return 'text-red-400';
        if (score >= 0.5) return 'text-orange-400';
        return 'text-green-400';
    };

    const filteredLogs = logs.filter(log =>
        log.source_ip.includes(search) ||
        log.uri.includes(search) ||
        (log.attack_type && log.attack_type.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-6 space-y-6 bg-slate-950/50 min-h-screen text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="h-6 w-6 text-blue-400" />
                        Events Log
                    </h2>
                    <p className="text-slate-400">Real-time WAF decision logs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-700 bg-slate-900 hover:bg-slate-800 h-9 px-3"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        placeholder="Search IP, URI, or Attack Type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex h-10 w-[180px] items-center justify-between rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="ALL">All Events</option>
                    <option value="BLOCKED">Blocked Only</option>
                    <option value="ALLOWED">Allowed Only</option>
                    <option value="PENDING">Pending Review</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-950/80 text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Source IP</th>
                                <th className="px-6 py-4">Country</th>
                                <th className="px-6 py-4">Request</th>
                                <th className="px-6 py-4">Risk Score</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredLogs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedEvent({
                                        id: String(log.id),
                                        timestamp: log.timestamp,
                                        // action property removed from here, defined below
                                        risk_score: log.risk_score * 100,
                                        source_ip: log.source_ip,
                                        country: log.geo_country,
                                        geo_city: 'Unknown', // Mapped
                                        geo_lat: 0,
                                        geo_lon: 0,
                                        method: 'GET', // Default
                                        uri: log.uri,
                                        ai_confidence: log.risk_score,
                                        action: (log.action === 'BLOCKED' ? 'BLOCK' : log.action === 'PENDING' ? 'FLAG' : 'ALLOW') as "BLOCK" | "ALLOW" | "FLAG",
                                        attack_type: log.attack_type,
                                        payload: log.full_body || log.uri,
                                        headers: log.headers ? JSON.parse(log.headers) : {},
                                        tags: log.attack_type ? [log.attack_type] : [],
                                        asn: 'N/A'
                                    })}
                                >
                                    <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-blue-400">
                                        {log.source_ip}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{getFlagEmoji(log.geo_country)}</span>
                                            <span className="text-slate-300">{log.geo_country || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[300px]">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-slate-800 text-cyan-400 ring-slate-700 font-mono">
                                                    {log.method}
                                                </span>
                                                <span className="font-mono text-slate-300 truncate" title={log.uri}>
                                                    {log.uri}
                                                </span>
                                            </div>
                                            {log.attack_type && (
                                                <span className="text-xs text-red-400 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {log.attack_type}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${log.risk_score >= 0.8 ? 'bg-red-500' : log.risk_score >= 0.5 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                    style={{ width: `${log.risk_score * 100}%` }}
                                                />
                                            </div>
                                            <span className={`font-bold ${getRiskColor(log.risk_score)}`}>
                                                {(log.risk_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getActionBadge(log.action)}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No events found matching your filter
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode === 'XX') return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
