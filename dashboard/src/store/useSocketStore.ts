import { create } from 'zustand';
import { AttackEvent, IPReputation, DashboardStats, ModelMetrics } from '../types';

interface SocketStore {
    // Connection state
    connected: boolean;

    // Data
    events: AttackEvent[];
    topIPs: IPReputation[];
    stats: DashboardStats | null;
    modelMetrics: ModelMetrics[];
    selectedEvent: AttackEvent | null;

    // Actions
    setConnected: (connected: boolean) => void;
    addEvent: (event: AttackEvent) => void;
    setTopIPs: (ips: IPReputation[]) => void;
    setStats: (stats: DashboardStats) => void;
    addModelMetric: (metric: ModelMetrics) => void;
    setSelectedEvent: (event: AttackEvent | null) => void;
    clearEvents: () => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
    connected: false,
    events: [],
    topIPs: [],
    stats: null,
    modelMetrics: [],
    selectedEvent: null,

    setConnected: (connected) => set({ connected }),

    addEvent: (event) =>
        set((state) => ({
            events: [event, ...state.events].slice(0, 100), // Keep last 100
        })),

    setTopIPs: (ips) => set({ topIPs: ips }),

    setStats: (stats) => set({ stats }),

    addModelMetric: (metric) =>
        set((state) => ({
            modelMetrics: [...state.modelMetrics, metric].slice(-20), // Keep last 20
        })),

    setSelectedEvent: (event) => set({ selectedEvent: event }),

    clearEvents: () => set({ events: [], modelMetrics: [] }),
}));

// WebSocket connection hook
let ws: WebSocket | null = null;

export function initializeWebSocket() {
    const store = useSocketStore.getState();

    // Use relative path for WebSocket (Vite proxy will handle it)
    const wsUrl = `ws://${window.location.hostname}:5000/ws`;

    console.log('Connecting to WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        store.setConnected(true);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'new_request') {
                // Convert backend format to frontend format
                const attackEvent: AttackEvent = {
                    id: data.data.decision_id?.toString() || Date.now().toString(),
                    timestamp: data.data.timestamp,
                    source_ip: data.data.source_ip,
                    asn: data.data.asn || 'AS0',
                    country: data.data.geo_country || 'XX',
                    geo_lat: data.data.geo_lat || 0,
                    geo_lon: data.data.geo_lon || 0,
                    geo_city: data.data.geo_city || 'Unknown',
                    method: data.data.method || 'GET',
                    uri: data.data.uri,
                    payload: data.data.body || '',
                    risk_score: Math.round(data.data.risk_score * 100),
                    ai_confidence: data.data.risk_score,
                    action: data.data.action === 'BLOCKED' ? 'BLOCK' : data.data.action === 'PENDING' ? 'FLAG' : 'ALLOW',
                    attack_type: data.data.attack_type,
                    tags: data.data.attack_type ? [data.data.attack_type] : [],
                    headers: data.data.headers ? JSON.parse(data.data.headers) : {},
                    full_body: data.data.full_body
                };

                store.addEvent(attackEvent);

                // Add model metric
                store.addModelMetric({
                    timestamp: data.data.timestamp,
                    confidence: data.data.risk_score,
                    drift_detected: data.data.risk_score > 0.9,
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        store.setConnected(false);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        store.setConnected(false);

        // Reconnect after 3 seconds
        setTimeout(() => {
            initializeWebSocket();
        }, 3000);
    };
}

export function closeWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }
}
