import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

interface AttackingIP {
    ip: string;
    country: string;
    country_code: string;
    request_count: number;
    threat_level: string;
}

export default function TopAttackingIPs() {
    const [ips, setIps] = useState<AttackingIP[]>([]);

    useEffect(() => {
        fetchTopIPs();
        const interval = setInterval(fetchTopIPs, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchTopIPs = async () => {
        try {
            const response = await fetch('/api/top-ips');
            const data = await response.json();
            setIps(data.slice(0, 10));
        } catch (error) {
            // Mock data for demo
            setIps([
                { ip: '202.106.0.20', country: 'China', country_code: 'CN', request_count: 245, threat_level: 'high' },
                { ip: '109.207.13.5', country: 'Russia', country_code: 'RU', request_count: 189, threat_level: 'critical' },
                { ip: '8.8.8.8', country: 'United States', country_code: 'US', request_count: 156, threat_level: 'medium' },
                { ip: '189.6.0.1', country: 'Brazil', country_code: 'BR', request_count: 134, threat_level: 'high' },
                { ip: '106.51.0.1', country: 'India', country_code: 'IN', request_count: 98, threat_level: 'low' },
            ]);
        }
    };

    const getThreatColor = (level: string) => {
        switch (level) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
            case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
                <Globe className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-bold">Top Attacking IPs</h3>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-gray-400 px-3 pb-2 border-b border-slate-700">
                    <div>IP Address</div>
                    <div>Country</div>
                    <div className="text-right">Requests</div>
                    <div className="text-right">Threat</div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                    {ips.map((ip, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-transparent hover:border-blue-500/30"
                        >
                            <div className="font-mono text-sm text-blue-400">{ip.ip}</div>
                            <div className="flex items-center space-x-2">
                                <span className="text-2xl">{getFlagEmoji(ip.country_code)}</span>
                                <span className="text-sm text-gray-300">{ip.country}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-orange-400">
                                    {ip.request_count.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${getThreatColor(ip.threat_level)}`}>
                                    {ip.threat_level.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
