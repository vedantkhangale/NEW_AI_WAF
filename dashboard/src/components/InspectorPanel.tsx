import { useSocketStore } from '../store/useSocketStore';
import { format } from 'date-fns';
import { X, AlertTriangle, Code2, TrendingDown, Activity, ShieldBan, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { useState } from 'react';

export default function InspectorPanel() {
    const { selectedEvent, setSelectedEvent, modelMetrics } = useSocketStore();
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    if (!selectedEvent) {
        return (
            <div className="w-96 bg-gray-800 border-l border-gray-700 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Event Selected</p>
                    <p className="text-sm mt-2">Click on an event to view details</p>
                </div>
            </div>
        );
    }

    // Actions
    const handleBlacklist = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: selectedEvent.source_ip })
            });
            if (res.ok) setActionStatus('IP Blacklisted');
            setTimeout(() => setActionStatus(null), 3000);
        } catch (e) {
            console.error(e);
        }
    };

    const handleFeedback = async (decision: 'ALLOW' | 'BLOCK') => {
        try {
            const res = await fetch('http://localhost:5000/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: selectedEvent.id,
                    decision: decision,
                    reviewer: 'admin'
                })
            });
            if (res.ok) {
                setActionStatus(decision === 'BLOCK' ? 'Marked as malicious' : 'Marked as safe');
                // Optimistically update UI if needed
            }
            setTimeout(() => setActionStatus(null), 3000);
        } catch (e) {
            console.error(e);
        }
    };

    // Prepare drift chart data
    const chartData = modelMetrics.slice(-15).map((metric) => ({
        time: format(new Date(metric.timestamp), 'HH:mm'),
        confidence: Math.round(metric.confidence * 100),
        isDrift: metric.drift_detected,
    }));

    const driftPoint = chartData.find(d => d.isDrift);

    // Syntax highlight the payload
    const highlightPayload = (payload: string) => {
        const sqlKeywords = ['SELECT', 'UNION', 'INSERT', 'DROP', 'DELETE', 'UPDATE', 'OR', 'AND', 'WHERE', 'FROM'];
        const xssPatterns = ['<script>', '</script>', 'javascript:', 'onerror', 'onload', 'alert('];

        let highlighted = payload;

        // Highlight SQL keywords
        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, `<span class="text-red-400 font-bold">${keyword}</span>`);
        });

        // Highlight XSS patterns
        xssPatterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'gi');
            highlighted = highlighted.replace(regex, `<span class="text-orange-400 font-bold">${pattern}</span>`);
        });

        return highlighted;
    };

    return (
        <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto scrollbar-thin relative">
            {actionStatus && (
                <div className="absolute top-16 left-4 right-4 bg-green-500/90 text-white p-2 rounded text-center text-sm z-50 animate-fade-in-down">
                    {actionStatus}
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold">Decision Explanation</h2>
                <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Event Overview */}
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Event ID</label>
                    <p className="text-sm font-mono text-gray-300 mt-1">#{selectedEvent.id}</p>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Timestamp</label>
                    <p className="text-sm text-gray-300 mt-1">
                        {format(new Date(selectedEvent.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Action</label>
                    <p className={`text-2xl font-bold mt-1 ${selectedEvent.action === 'BLOCK' ? 'text-red-500' :
                        selectedEvent.action === 'FLAG' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                        {selectedEvent.action}
                    </p>
                </div>

                {/* Manual Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleFeedback('ALLOW')}
                        className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-green-600/20 hover:text-green-400 hover:border-green-500/50 border border-slate-600 p-2 rounded transition-all text-sm"
                    >
                        <ThumbsUp className="w-4 h-4" />
                        <span>Mark Safe</span>
                    </button>
                    <button
                        onClick={() => handleFeedback('BLOCK')}
                        className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 border border-slate-600 p-2 rounded transition-all text-sm"
                    >
                        <ThumbsDown className="w-4 h-4" />
                        <span>Mark Bad</span>
                    </button>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Reason</label>
                    <p className="text-sm text-gray-300 mt-1">
                        {selectedEvent.attack_type || 'Suspicious pattern detected'}
                    </p>
                </div>

                {/* Headers Viewer (Wireshark Style) */}
                {selectedEvent.headers && Object.keys(selectedEvent.headers).length > 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <label className="text-xs text-gray-400 uppercase tracking-wide">Request Headers</label>
                        </div>
                        <div className="overflow-x-auto max-h-40 overflow-y-auto scrollbar-thin">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {Object.entries(selectedEvent.headers).map(([key, value]) => (
                                        <tr key={key} className="border-b border-gray-800 last:border-0">
                                            <td className="py-1 pr-4 font-mono text-xs text-blue-400 whitespace-nowrap align-top">{key}:</td>
                                            <td className="py-1 font-mono text-xs text-gray-300 break-all">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Payload Viewer */}
                {selectedEvent.payload && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <Code2 className="w-4 h-4 text-gray-400" />
                            <label className="text-xs text-gray-400 uppercase tracking-wide">Payload</label>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                            <pre
                                className="text-gray-300 whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{
                                    __html: highlightPayload(selectedEvent.payload.slice(0, 1000))
                                }}
                            />
                            {selectedEvent.payload.length > 1000 && (
                                <p className="text-gray-500 mt-2">... (truncated)</p>
                            )}
                        </div>
                    </div>
                )}

                {/* IP Reputation Card */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold">IP Reputation</h3>
                        <button
                            onClick={handleBlacklist}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded px-2 py-1 text-xs flex items-center space-x-1 transition-colors"
                        >
                            <ShieldBan className="w-3 h-3" />
                            <span>BAN IP</span>
                        </button>
                    </div>

                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Risk Score</span>
                            <span className={`text-lg font-bold ${selectedEvent.risk_score > 80 ? 'text-red-500' :
                                selectedEvent.risk_score > 50 ? 'text-orange-500' : 'text-yellow-500'
                                }`}>
                                {selectedEvent.risk_score}/100
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${selectedEvent.risk_score > 80 ? 'bg-red-500' :
                                    selectedEvent.risk_score > 50 ? 'bg-orange-500' : 'bg-yellow-500'
                                    }`}
                                style={{ width: `${selectedEvent.risk_score}%` }}
                            ></div>
                        </div>
                    </div>

                    {selectedEvent.risk_score > 80 && (
                        <div className="mb-3">
                            <span className="text-xs font-bold text-red-400 uppercase">Critical Risk</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Source IP</span>
                            <span className="font-mono text-blue-400">{selectedEvent.source_ip}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Location</span>
                            <span>{selectedEvent.geo_city}, {selectedEvent.country}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">ASN</span>
                            <span className="font-mono">{selectedEvent.asn}</span>
                        </div>
                    </div>

                    {selectedEvent.tags?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedEvent.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-1 text-xs bg-red-500 bg-opacity-20 text-red-400 rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Model Drift Monitor */}
                {chartData.length > 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <TrendingDown className="w-4 h-4 text-gray-400" />
                            <h3 className="text-sm font-bold">Model Confidence</h3>
                        </div>

                        <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#6b7280"
                                    style={{ fontSize: '10px' }}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '10px' }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="confidence"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#confidenceGradient)"
                                />
                                {driftPoint && (
                                    <ReferenceDot
                                        x={driftPoint.time}
                                        y={driftPoint.confidence}
                                        r={4}
                                        fill="#ef4444"
                                        stroke="#fff"
                                        strokeWidth={2}
                                        label={{
                                            value: 'Drift Detected',
                                            position: 'top',
                                            fill: '#ef4444',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>

                        {driftPoint && (
                            <div className="mt-2 text-xs text-red-400 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Model drift detected - retraining recommended</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
