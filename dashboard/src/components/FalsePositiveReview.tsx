import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Brain, TrendingUp, RefreshCw } from 'lucide-react';

interface PendingReview {
    id: number;
    timestamp: string;
    source_ip: string;
    method: string;
    uri: string;
    query_string: string;
    body_sample: string;
    risk_score: number;
    risk_factors: Record<string, number>;
    attack_type: string;
    user_agent: string;
    geo_country: string;
    geo_city: string;
}

interface ModelStatus {
    status: 'training' | 'live';
    version: string;
    last_trained: string;
    accuracy: number;
}

export default function FalsePositiveReview() {
    const [queue, setQueue] = useState<PendingReview[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [modelStatus, setModelStatus] = useState<ModelStatus>({
        status: 'live',
        version: 'v1.2',
        last_trained: new Date().toISOString(),
        accuracy: 0.94
    });
    const [loading, setLoading] = useState(false);
    const [actionStatus, setActionStatus] = useState<'idle' | 'processing'>('idle');

    useEffect(() => {
        fetchQueue();
        fetchModelStatus();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            // Fetch pending reviews - for now using /api/requests with PENDING filter
            const response = await fetch('http://localhost:5000/api/requests?action=PENDING&limit=50');
            const data = await response.json();
            setQueue(data.requests || []);
        } catch (error) {
            console.error('Failed to fetch queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModelStatus = async () => {
        try {
            // Mock model status - will connect to backend
            setModelStatus({
                status: 'live',
                version: 'v1.2',
                last_trained: new Date(Date.now() - 86400000 * 2).toISOString(),
                accuracy: 0.94
            });
        } catch (error) {
            console.error('Failed to fetch model status:', error);
        }
    };

    const handleDecision = async (decision: 'confirm' | 'false_positive') => {
        if (!currentRequest) return;

        setActionStatus('processing');
        try {
            // Submit feedback to backend
            await fetch('http://localhost:5000/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: currentRequest.id,
                    decision: decision === 'confirm' ? 'BLOCK' : 'ALLOW',
                    reviewer: 'human',
                    notes: decision === 'false_positive' ? 'Marked as false positive' : 'Confirmed as attack'
                })
            });

            // Move to next item
            if (currentIndex < queue.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                // Refresh queue
                fetchQueue();
                setCurrentIndex(0);
            }
        } catch (error) {
            console.error('Failed to submit decision:', error);
            alert('Failed to submit decision. Please try again.');
        } finally {
            setActionStatus('idle');
        }
    };

    const currentRequest = queue[currentIndex];

    // Get top risk factors
    const getTopRiskFactors = (factors: Record<string, number>) => {
        return Object.entries(factors)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-400">Loading review queue...</p>
                </div>
            </div>
        );
    }

    if (queue.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">All Clear! 🎉</h2>
                    <p className="text-gray-400">No pending reviews at the moment.</p>
                    <button
                        onClick={fetchQueue}
                        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg"
                    >
                        Refresh Queue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header with Model Status */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">False Positive Review</h1>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${modelStatus.status === 'training'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                        <Brain className="w-5 h-5" />
                        <span className="font-semibold">
                            Model: {modelStatus.status === 'training' ? 'Training...' : `Live (${modelStatus.version})`}
                        </span>
                    </div>
                    <div className="text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>Accuracy: {(modelStatus.accuracy * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Progress */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Review Progress</span>
                    <span className="text-sm font-semibold">{currentIndex + 1} / {queue.length}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Decision Card */}
            {currentRequest && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold">Request #{currentRequest.id}</span>
                            <span className={`px-3 py-1 rounded-lg font-semibold ${currentRequest.risk_score >= 80
                                    ? 'bg-red-500/30 text-red-300'
                                    : 'bg-orange-500/30 text-orange-300'
                                }`}>
                                Risk Score: {(currentRequest.risk_score / 100).toFixed(2)}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {new Date(currentRequest.timestamp).toLocaleString()} •
                            {currentRequest.source_ip} •
                            {currentRequest.geo_city}, {currentRequest.geo_country}
                        </p>
                    </div>

                    {/* Request Details */}
                    <div className="p-6 space-y-6">
                        {/* HTTP Request */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">HTTP Request</h3>
                            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-2">
                                <div>
                                    <span className="text-blue-400">{currentRequest.method}</span>{' '}
                                    <span className="text-white">{currentRequest.uri}</span>
                                </div>
                                {currentRequest.query_string && (
                                    <div className="text-gray-400">
                                        Query: <span className="text-red-300">{currentRequest.query_string}</span>
                                    </div>
                                )}
                                <div className="text-gray-500 text-xs">
                                    User-Agent: {currentRequest.user_agent || 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Why I Blocked This */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                                Why I Blocked This
                            </h3>
                            <div className="bg-gray-900 rounded-lg p-4">
                                <div className="mb-3">
                                    <span className="text-sm text-gray-400">Detected Attack Type:</span>
                                    <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-semibold">
                                        {currentRequest.attack_type || 'Unknown'}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-300">Top Contributing Factors:</p>
                                    {currentRequest.risk_factors && getTopRiskFactors(currentRequest.risk_factors).map(([factor, score]) => (
                                        <div key={factor} className="flex items-center space-x-3">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm">{factor}</span>
                                                    <span className="text-xs text-gray-500">{(score * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className="bg-orange-500 h-1.5 rounded-full"
                                                        style={{ width: `${score * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!currentRequest.risk_factors || Object.keys(currentRequest.risk_factors).length === 0) && (
                                        <p className="text-sm text-gray-500">No detailed factors available</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payload Preview */}
                        {currentRequest.body_sample && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Payload Sample</h3>
                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-32 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap break-words">
                                        {currentRequest.body_sample}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-gray-700 p-6 bg-gray-800/50">
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={() => handleDecision('false_positive')}
                                disabled={actionStatus === 'processing'}
                                className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span>Mark Safe (False Positive)</span>
                            </button>

                            <button
                                onClick={() => handleDecision('confirm')}
                                disabled={actionStatus === 'processing'}
                                className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                                <span>Confirm Attack</span>
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <p className="text-xs text-gray-500">
                                This decision will be used to improve the AI model's accuracy
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                    <strong>💡 Tip:</strong> False positives help the AI learn legitimate patterns.
                    Confirmed attacks reinforce detection capabilities. Your feedback directly improves security accuracy.
                </p>
            </div>
        </div>
    );
}
