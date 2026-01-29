import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, AlertTriangle, Check, X } from 'lucide-react';

interface CustomRule {
    id?: number;
    name: string;
    pattern: string;
    target: 'header' | 'body' | 'uri';
    action: 'block' | 'challenge' | 'allow';
    enabled: boolean;
}

export default function RulesManager() {
    const [threshold, setThreshold] = useState(0.7);
    const [customRules, setCustomRules] = useState<CustomRule[]>([]);
    const [trustedIPs, setTrustedIPs] = useState<string[]>([]);
    const [bannedIPs, setBannedIPs] = useState<string[]>([]);

    const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
    const [newTrustedIP, setNewTrustedIP] = useState('');
    const [newBannedIP, setNewBannedIP] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Load data on mount
    useEffect(() => {
        fetchRulesData();
    }, []);

    const fetchRulesData = async () => {
        try {
            // Fetch threshold, rules, and IP lists
            // For now, using mock data - will connect to backend
            setThreshold(0.7);
            setCustomRules([
                { id: 1, name: 'Block SQL Injection', pattern: '(union|select|drop|insert)', target: 'uri', action: 'block', enabled: true },
                { id: 2, name: 'Block XSS Attempts', pattern: '<script.*?>', target: 'body', action: 'block', enabled: true },
            ]);
            setTrustedIPs(['192.168.1.0/24', '10.0.0.5/32']);
            setBannedIPs(['203.0.113.0/24', '198.51.100.42/32']);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        }
    };

    // Validate CIDR notation
    const validateCIDR = (cidr: string): boolean => {
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[1-2]\d|3[0-2]))?$/;
        if (!cidrRegex.test(cidr)) return false;

        const [ip] = cidr.split('/');
        const octets = ip.split('.').map(Number);
        return octets.every(octet => octet >= 0 && octet <= 255);
    };

    // Validate regex pattern (simple ReDoS prevention)
    const validateRegex = (pattern: string): { valid: boolean; error?: string } => {
        try {
            new RegExp(pattern);

            // Basic ReDoS checks
            const redosPatterns = [
                /(\(.*\*.*\))\+/,  // Nested quantifiers
                /(\(.*\+.*\))\*/,
                /(\w+\*)+/,        // Repeated quantifiers
            ];

            for (const redosPattern of redosPatterns) {
                if (redosPattern.test(pattern)) {
                    return { valid: false, error: 'Pattern may cause ReDoS - avoid nested quantifiers' };
                }
            }

            return { valid: true };
        } catch (e) {
            return { valid: false, error: 'Invalid regex pattern' };
        }
    };

    // Get threshold label
    const getThresholdLabel = (value: number): string => {
        if (value <= 0.3) return 'Paranoid';
        if (value <= 0.5) return 'Strict';
        if (value <= 0.7) return 'Balanced';
        if (value <= 0.85) return 'Permissive';
        return 'Relaxed';
    };

    const getThresholdColor = (value: number): string => {
        if (value <= 0.3) return 'text-red-500';
        if (value <= 0.5) return 'text-orange-500';
        if (value <= 0.7) return 'text-yellow-500';
        if (value <= 0.85) return 'text-green-500';
        return 'text-blue-500';
    };

    // Save threshold
    const saveThreshold = async () => {
        setSaveStatus('saving');
        try {
            // API call to save threshold
            await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    // Add/Update custom rule
    const saveCustomRule = () => {
        if (!editingRule) return;

        const validation = validateRegex(editingRule.pattern);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        if (editingRule.id) {
            // Update existing
            setCustomRules(rules => rules.map(r => r.id === editingRule.id ? editingRule : r));
        } else {
            // Add new
            setCustomRules(rules => [...rules, { ...editingRule, id: Date.now() }]);
        }
        setEditingRule(null);
    };

    // Delete custom rule
    const deleteRule = (id: number) => {
        if (confirm('Are you sure you want to delete this rule?')) {
            setCustomRules(rules => rules.filter(r => r.id !== id));
        }
    };

    // Add IP to list
    const addIP = (type: 'trusted' | 'banned') => {
        const ip = type === 'trusted' ? newTrustedIP : newBannedIP;

        if (!validateCIDR(ip)) {
            alert('Invalid CIDR notation. Use format: 192.168.1.0/24 or 10.0.0.5/32');
            return;
        }

        if (type === 'trusted') {
            setTrustedIPs([...trustedIPs, ip]);
            setNewTrustedIP('');
        } else {
            setBannedIPs([...bannedIPs, ip]);
            setNewBannedIP('');
        }
    };

    // Remove IP from list
    const removeIP = (type: 'trusted' | 'banned', ip: string) => {
        if (type === 'trusted') {
            setTrustedIPs(trustedIPs.filter(i => i !== ip));
        } else {
            setBannedIPs(bannedIPs.filter(i => i !== ip));
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center">
                    <Shield className="w-8 h-8 mr-3 text-blue-500" />
                    Security Rules Configuration
                </h1>
            </div>

            {/* Global Sensitivity Slider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">AI Sensitivity Threshold</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Current Threshold:</span>
                        <span className={`text-2xl font-bold ${getThresholdColor(threshold)}`}>
                            {threshold.toFixed(2)} - {getThresholdLabel(threshold)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0.1"
                            max="0.99"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>0.1 (Paranoid)</span>
                            <span>0.5 (Balanced)</span>
                            <span>0.99 (Permissive)</span>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded p-3 text-sm text-gray-400">
                        <p>
                            <strong>Lower values</strong> block more requests (stricter security).
                            <strong> Higher values</strong> allow more requests (better user experience).
                        </p>
                    </div>

                    <button
                        onClick={saveThreshold}
                        disabled={saveStatus === 'saving'}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${saveStatus === 'success'
                                ? 'bg-green-500 text-white'
                                : saveStatus === 'error'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {saveStatus === 'success' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

            {/* Custom Rules */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Custom Rules</h2>
                    <button
                        onClick={() => setEditingRule({ name: '', pattern: '', target: 'uri', action: 'block', enabled: true })}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Rule</span>
                    </button>
                </div>

                {/* Rules List */}
                <div className="space-y-2">
                    {customRules.map(rule => (
                        <div key={rule.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <span className="font-semibold">{rule.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${rule.action === 'block' ? 'bg-red-500/20 text-red-400' :
                                            rule.action === 'challenge' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                        }`}>
                                        {rule.action.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 mt-1">
                                    <span className="font-mono bg-gray-800 px-2 py-1 rounded">{rule.pattern}</span>
                                    <span className="mx-2">→</span>
                                    <span>Target: {rule.target}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setEditingRule(rule)}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteRule(rule.id!)}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rule Editor Modal */}
            {editingRule && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl">
                        <h3 className="text-xl font-bold mb-4">{editingRule.id ? 'Edit Rule' : 'New Rule'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Rule Name</label>
                                <input
                                    type="text"
                                    value={editingRule.name}
                                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                                    className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Block SQL Injection"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Pattern (Regex)</label>
                                <input
                                    type="text"
                                    value={editingRule.pattern}
                                    onChange={e => setEditingRule({ ...editingRule, pattern: e.target.value })}
                                    className="w-full bg-gray-700 px-4 py-2 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., (union|select|drop)"
                                />
                                {editingRule.pattern && !validateRegex(editingRule.pattern).valid && (
                                    <p className="text-red-400 text-sm mt-1 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                        {validateRegex(editingRule.pattern).error}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Target</label>
                                    <select
                                        value={editingRule.target}
                                        onChange={e => setEditingRule({ ...editingRule, target: e.target.value as any })}
                                        className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="uri">URI</option>
                                        <option value="header">Header</option>
                                        <option value="body">Body</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Action</label>
                                    <select
                                        value={editingRule.action}
                                        onChange={e => setEditingRule({ ...editingRule, action: e.target.value as any })}
                                        className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="block">Block</option>
                                        <option value="challenge">Challenge</option>
                                        <option value="allow">Allow</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={() => setEditingRule(null)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveCustomRule}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center space-x-2"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Save Rule</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* IP Lists */}
            <div className="grid grid-cols-2 gap-6">
                {/* Trusted IPs */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-green-400">Trusted IPs (Whitelist)</h2>

                    <div className="flex space-x-2 mb-4">
                        <input
                            type="text"
                            value={newTrustedIP}
                            onChange={e => setNewTrustedIP(e.target.value)}
                            placeholder="192.168.1.0/24"
                            className="flex-1 bg-gray-700 px-4 py-2 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                            onKeyPress={e => e.key === 'Enter' && addIP('trusted')}
                        />
                        <button
                            onClick={() => addIP('trusted')}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {trustedIPs.map(ip => (
                            <div key={ip} className="bg-gray-900 rounded px-4 py-2 flex items-center justify-between">
                                <span className="font-mono text-sm">{ip}</span>
                                <button
                                    onClick={() => removeIP('trusted', ip)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {trustedIPs.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No trusted IPs</p>
                        )}
                    </div>
                </div>

                {/* Banned IPs */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-red-400">Banned IPs (Blacklist)</h2>

                    <div className="flex space-x-2 mb-4">
                        <input
                            type="text"
                            value={newBannedIP}
                            onChange={e => setNewBannedIP(e.target.value)}
                            placeholder="203.0.113.0/24"
                            className="flex-1 bg-gray-700 px-4 py-2 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                            onKeyPress={e => e.key === 'Enter' && addIP('banned')}
                        />
                        <button
                            onClick={() => addIP('banned')}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {bannedIPs.map(ip => (
                            <div key={ip} className="bg-gray-900 rounded px-4 py-2 flex items-center justify-between">
                                <span className="font-mono text-sm">{ip}</span>
                                <button
                                    onClick={() => removeIP('banned', ip)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {bannedIPs.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No banned IPs</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Changes to rules and IP lists take effect immediately.
                    Test thoroughly before deploying to production. Custom rules are evaluated before AI analysis.
                </p>
            </div>
        </div>
    );
}
