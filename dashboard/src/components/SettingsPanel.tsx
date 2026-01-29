import { useState, useEffect } from 'react';
import { Settings, Globe, Bell, AlertTriangle, Trash2, RefreshCw, Send, Plus, X, Check } from 'lucide-react';

interface WebhookConfig {
    id?: number;
    name: string;
    url: string;
    enabled: boolean;
}

interface DangerAction {
    id: string;
    title: string;
    description: string;
    confirmText: string;
    icon: any;
    action: () => Promise<void>;
}

export default function SettingsPanel() {
    const [protectedHost, setProtectedHost] = useState('localhost');
    const [protectedPort, setProtectedPort] = useState('8080');
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [newWebhook, setNewWebhook] = useState<WebhookConfig>({ name: '', url: '', enabled: true });
    const [showWebhookForm, setShowWebhookForm] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{ show: boolean; action: DangerAction | null; input: string }>({
        show: false,
        action: null,
        input: ''
    });
    const [actionStatus, setActionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // Load current settings - mock for now
            setProtectedHost('localhost');
            setProtectedPort('8080');
            setWebhooks([
                { id: 1, name: 'Slack Alerts', url: 'https://hooks.slack.com/services/XXX', enabled: true },
                { id: 2, name: 'Discord Security', url: 'https://discord.com/api/webhooks/XXX', enabled: false }
            ]);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const saveUpstreamConfig = async () => {
        setActionStatus('processing');
        try {
            // API call to update upstream config
            await new Promise(resolve => setTimeout(resolve, 500));
            setActionStatus('success');
            setStatusMessage('Upstream configuration saved successfully');
            setTimeout(() => setActionStatus('idle'), 2000);
        } catch (error) {
            setActionStatus('error');
            setStatusMessage('Failed to save upstream configuration');
            setTimeout(() => setActionStatus('idle'), 2000);
        }
    };

    const addWebhook = () => {
        if (!newWebhook.name || !newWebhook.url) {
            alert('Please fill in all webhook fields');
            return;
        }

        if (!newWebhook.url.startsWith('http')) {
            alert('Webhook URL must start with http:// or https://');
            return;
        }

        setWebhooks([...webhooks, { ...newWebhook, id: Date.now() }]);
        setNewWebhook({ name: '', url: '', enabled: true });
        setShowWebhookForm(false);
    };

    const removeWebhook = (id: number) => {
        setWebhooks(webhooks.filter(w => w.id !== id));
    };

    const testWebhook = async (webhook: WebhookConfig) => {
        setActionStatus('processing');
        setStatusMessage(`Testing ${webhook.name}...`);
        try {
            // Send test alert
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: '🧪 AegisX WAF Test Alert',
                    content: 'This is a test alert from AegisX WAF. If you received this, your webhook is configured correctly!',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                setActionStatus('success');
                setStatusMessage(`Test alert sent to ${webhook.name} successfully!`);
            } else {
                throw new Error('Webhook returned error');
            }
        } catch (error) {
            setActionStatus('error');
            setStatusMessage(`Failed to send test alert to ${webhook.name}`);
        } finally {
            setTimeout(() => setActionStatus('idle'), 3000);
        }
    };

    const dangerActions: DangerAction[] = [
        {
            id: 'flush-redis',
            title: 'Flush Redis Logs',
            description: 'Permanently delete all request logs from Redis cache. This cannot be undone.',
            confirmText: 'FLUSH',
            icon: Trash2,
            action: async () => {
                await fetch('http://localhost:5000/api/admin/flush-redis', { method: 'POST' });
            }
        },
        {
            id: 'reset-model',
            title: 'Reset AI Model',
            description: 'Reset the AI model to factory defaults. All training data will be lost.',
            confirmText: 'RESET',
            icon: RefreshCw,
            action: async () => {
                await fetch('http://localhost:5000/api/admin/reset-model', { method: 'POST' });
            }
        },
        {
            id: 'restart-waf',
            title: 'Restart WAF Service',
            description: 'Restart the WAF engine. This may cause brief downtime (5-10 seconds).',
            confirmText: 'RESTART',
            icon: RefreshCw,
            action: async () => {
                await fetch('http://localhost:5000/api/admin/restart', { method: 'POST' });
            }
        }
    ];

    const handleDangerAction = (action: DangerAction) => {
        setConfirmModal({ show: true, action, input: '' });
    };

    const executeDangerAction = async () => {
        if (!confirmModal.action) return;

        if (confirmModal.input !== confirmModal.action.confirmText) {
            alert(`Please type "${confirmModal.action.confirmText}" to confirm`);
            return;
        }

        setActionStatus('processing');
        setStatusMessage(`Executing ${confirmModal.action.title}...`);

        try {
            await confirmModal.action.action();
            setActionStatus('success');
            setStatusMessage(`${confirmModal.action.title} completed successfully`);
            setConfirmModal({ show: false, action: null, input: '' });
        } catch (error) {
            setActionStatus('error');
            setStatusMessage(`Failed to execute ${confirmModal.action.title}`);
        } finally {
            setTimeout(() => setActionStatus('idle'), 3000);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center">
                    <Settings className="w-8 h-8 mr-3 text-blue-500" />
                    System Settings
                </h1>
            </div>

            {/* Status Alert */}
            {actionStatus !== 'idle' && (
                <div className={`p-4 rounded-lg flex items-center space-x-3 ${actionStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                        actionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                    }`}>
                    {actionStatus === 'success' && <Check className="w-5 h-5" />}
                    {actionStatus === 'error' && <X className="w-5 h-5" />}
                    {actionStatus === 'processing' && <RefreshCw className="w-5 h-5 animate-spin" />}
                    <span>{statusMessage}</span>
                </div>
            )}

            {/* Upstream Configuration */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-blue-400" />
                    Upstream Configuration
                </h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Protected Host</label>
                            <input
                                type="text"
                                value={protectedHost}
                                onChange={e => setProtectedHost(e.target.value)}
                                className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., backend.example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Protected Port</label>
                            <input
                                type="number"
                                value={protectedPort}
                                onChange={e => setProtectedPort(e.target.value)}
                                className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 8080"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400">
                        The WAF will forward legitimate traffic to this upstream server.
                    </p>
                    <button
                        onClick={saveUpstreamConfig}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
                    >
                        Save Upstream Config
                    </button>
                </div>
            </div>

            {/* Notification Channels */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-yellow-400" />
                        Alert Webhooks
                    </h2>
                    <button
                        onClick={() => setShowWebhookForm(!showWebhookForm)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Webhook</span>
                    </button>
                </div>

                {/* Add Webhook Form */}
                {showWebhookForm && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold mb-3">New Webhook</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newWebhook.name}
                                onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                placeholder="Webhook Name (e.g., Slack Security)"
                                className="w-full bg-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="url"
                                value={newWebhook.url}
                                onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                placeholder="Webhook URL (https://...)"
                                className="w-full bg-gray-700 px-4 py-2 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowWebhookForm(false)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addWebhook}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg"
                                >
                                    Add Webhook
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Webhook List */}
                <div className="space-y-2">
                    {webhooks.map(webhook => (
                        <div key={webhook.id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <div className="font-semibold">{webhook.name}</div>
                                <div className="text-sm text-gray-400 font-mono truncate">{webhook.url}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => testWebhook(webhook)}
                                    className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>Test</span>
                                </button>
                                <button
                                    onClick={() => removeWebhook(webhook.id!)}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {webhooks.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No webhooks configured</p>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border-2 border-red-500/50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                    <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                    These actions are destructive and cannot be undone. Proceed with caution.
                </p>

                <div className="space-y-3">
                    {dangerActions.map(action => (
                        <div key={action.id} className="bg-gray-900 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <div className="font-semibold text-red-300 flex items-center">
                                    <action.icon className="w-4 h-4 mr-2" />
                                    {action.title}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{action.description}</div>
                            </div>
                            <button
                                onClick={() => handleDangerAction(action)}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg font-semibold transition-colors"
                            >
                                Execute
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.show && confirmModal.action && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border-2 border-red-500 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                            <h3 className="text-xl font-bold text-red-400">Confirm Destructive Action</h3>
                        </div>

                        <p className="text-gray-300 mb-4">{confirmModal.action.description}</p>

                        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">
                            <p className="text-sm text-red-300">
                                To confirm, type <strong className="font-mono">{confirmModal.action.confirmText}</strong> below:
                            </p>
                        </div>

                        <input
                            type="text"
                            value={confirmModal.input}
                            onChange={e => setConfirmModal({ ...confirmModal, input: e.target.value })}
                            className="w-full bg-gray-700 px-4 py-2 rounded-lg mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder={confirmModal.action.confirmText}
                            autoFocus
                        />

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setConfirmModal({ show: false, action: null, input: '' })}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDangerAction}
                                disabled={confirmModal.input !== confirmModal.action.confirmText}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                            >
                                {confirmModal.action.title}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
