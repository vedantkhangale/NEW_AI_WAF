export interface AttackEvent {
    id: string;
    timestamp: string;
    source_ip: string;
    asn: string;
    country: string;
    geo_lat: number;
    geo_lon: number;
    geo_city: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    uri: string;
    payload: string;
    risk_score: number; // 0-100
    ai_confidence: number; // 0.0-1.0
    action: "BLOCK" | "ALLOW" | "FLAG";
    attack_type: string | null;
    tags: string[]; // e.g., ["Botnet", "SQLi"]
    headers?: Record<string, string>;
    full_body?: string;
}

export interface IPReputation {
    ip: string;
    asn: string;
    country: string;
    request_count: number;
    blocked_count: number;
    reputation_score: number; // 0-100
    tags: string[];
}

export interface ModelMetrics {
    timestamp: string;
    confidence: number; // 0.0-1.0
    drift_detected: boolean;
}

export interface DashboardStats {
    total_requests: number;
    blocked_requests: number;
    allowed_requests: number;
    pending_requests: number;
    avg_risk_score: number;
    unique_ips: number;
}
