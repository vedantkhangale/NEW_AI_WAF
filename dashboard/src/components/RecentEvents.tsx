import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface Event {
    id: string;
    timestamp: string;
    method: string;
    uri: string;
    attack_type: string;
    action: string;
    severity: string;
}

export default function RecentEvents() {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/recent-events');
            const data = await response.json();
            setEvents(data.slice(0, 10));
        } catch (error) {
            // Mock data
            setEvents([
                { id: '1', timestamp: new Date().toISOString(), method: 'GET', uri: '/?id=1\' OR \'1\'=\'1', attack_type: 'SQL Injection', action: 'BLOCK', severity: 'critical' },
                { id: '2', timestamp: new Date(Date.now() - 5000).toISOString(), method: 'POST', uri: '/login?user=admin\'--', attack_type: 'SQL Injection', action: 'BLOCK', severity: 'high' },
                { id: '3', timestamp: new Date(Date.now() - 10000).toISOString(), method: 'GET', uri: '/?name=<script>alert(1)</script>', attack_type: 'XSS', action: 'BLOCK', severity: 'high' },
                { id: '4', timestamp: new Date(Date.now() - 15000).toISOString(), method: 'GET', uri: '/../../etc/passwd', attack_type: 'Path Traversal', action: 'BLOCK', severity: 'critical' },
                { id: '5', timestamp: new Date(Date.now() - 20000).toISOString(), method: 'GET', uri: '/?cmd=ls;whoami', attack_type: 'Command Injection', action: 'BLOCK', severity: 'critical' },
            ]);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/40';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
        }
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'POST': return 'text-green-400';
            case 'GET': return 'text-blue-400';
            case 'PUT': return 'text-yellow-400';
            case 'DELETE': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold">Recent High-Severity Events</h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {events.map((event) => (
                    <div
                        key={event.id}
                        className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-orange-500/30 transition-all"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${getSeverityColor(event.severity)}`}>
                                {event.severity.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex items-center space-x-3 mb-2">
                            <span className={`text-sm font-bold ${getMethodColor(event.method)}`}>
                                {event.method}
                            </span>
                            <span className="text-sm text-gray-300 font-mono truncate">
                                {event.uri}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {event.attack_type}
                            </span>
                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                {event.action}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
