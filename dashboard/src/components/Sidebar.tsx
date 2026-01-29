import { Shield, BarChart3, Activity, FileCode, Brain, Settings } from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'events', label: 'Events', icon: Activity },
    { id: 'rules', label: 'Rules', icon: FileCode },
    { id: 'training', label: 'AI Training', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const [activeItem, setActiveItem] = useState('overview');

    return (
        <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-blue-500/20 flex flex-col backdrop-blur-xl">
            {/* Logo */}
            <div className="p-6 border-b border-blue-500/20">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Shield className="w-10 h-10 text-blue-400" />
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            AegisX WAF
                        </h1>
                        <p className="text-xs text-gray-400 font-medium">Security Operations Center</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveItem(item.id);
                                window.dispatchEvent(new CustomEvent('navigate', { detail: { view: item.id } }));
                            }}
                            className={`
                                w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:bg-slate-800/50 hover:text-gray-200 border border-transparent'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : ''}`} />
                            <span className="font-medium">{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-blue-500/20">
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-green-400">All Systems Operational</span>
                    </div>
                    <p className="text-xs text-gray-400">Last updated: just now</p>
                </div>
            </div>
        </div>
    );
}
