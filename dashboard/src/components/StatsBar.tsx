import { useSocketStore } from '../store/useSocketStore';
import { TrendingUp, TrendingDown, Activity, Shield } from 'lucide-react';

export default function StatsBar() {
    const { stats, connected } = useSocketStore();

    const statCards = [
        {
            label: 'Total Requests',
            value: stats?.total_requests || 0,
            icon: Activity,
            trend: '+12%',
            trendUp: true,
        },
        {
            label: 'Blocked',
            value: stats?.blocked_requests || 0,
            icon: Shield,
            trend: '-5%',
            trendUp: false,
            color: 'text-red-500',
        },
        {
            label: 'Allowed',
            value: stats?.allowed_requests || 0,
            icon: Shield,
            trend: '+8%',
            trendUp: true,
            color: 'text-green-500',
        },
        {
            label: 'Unique IPs',
            value: stats?.unique_ips || 0,
            icon: Activity,
            trend: '+3%',
            trendUp: true,
        },
    ];

    return (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex items-center justify-between">
                <div className="grid grid-cols-4 gap-6 flex-1">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;

                        return (
                            <div key={stat.label} className="flex items-center space-x-3">
                                <div className="p-2 bg-gray-700 rounded-lg">
                                    <Icon className={`w-5 h-5 ${stat.color || 'text-blue-500'}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">{stat.label}</p>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-xl font-bold">{stat.value.toLocaleString()}</p>
                                        <span className={`text-xs flex items-center ${stat.trendUp ? 'text-green-500' : 'text-red-500'}`}>
                                            <TrendIcon className="w-3 h-3 mr-1" />
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-400">
                        {connected ? 'Live Feed' : 'Disconnected'}
                    </span>
                </div>
            </div>
        </div>
    );
}
