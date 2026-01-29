-- AegisX WAF Database Schema
-- PostgreSQL 15+

-- Extension for better IP address handling
CREATE EXTENSION IF NOT EXISTS citext;

-- Main requests table - stores all intercepted traffic
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request metadata
    source_ip INET NOT NULL,
    source_port INTEGER,
    geo_country VARCHAR(2),
    geo_city VARCHAR(100),
    geo_lat FLOAT,
    geo_lon FLOAT,
    
    -- HTTP details
    method VARCHAR(10) NOT NULL,
    uri TEXT NOT NULL,
    query_string TEXT,
    user_agent TEXT,
    referer TEXT,
    content_type VARCHAR(100),
    content_length INTEGER,
    
    -- Request body (sanitized, max 10KB)
    -- Request body (sanitized, max 10KB by default)
    body_sample TEXT,
    full_body TEXT, -- For larger payloads
    
    -- Headers (for Wireshark-style inspection)
    headers JSONB,
    
    -- AI analysis
    risk_score FLOAT,
    risk_factors JSONB,
    features JSONB,
    
    -- Decision
    action VARCHAR(20) NOT NULL, -- ALLOWED, BLOCKED, PENDING
    decision_latency_ms INTEGER,
    
    -- Human review
    human_decision VARCHAR(20), -- NULL, ALLOW, BLOCK
    human_reviewed_at TIMESTAMPTZ,
    human_reviewer VARCHAR(100),
    human_notes TEXT,
    
    -- Additional metadata
    attack_type VARCHAR(50), -- SQL_INJECTION, XSS, PATH_TRAVERSAL, etc.
    blocked_by VARCHAR(50) -- AI, RULE, HUMAN
);

-- Indexes for requests table
CREATE INDEX IF NOT EXISTS idx_timestamp ON requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_source_ip ON requests(source_ip);
CREATE INDEX IF NOT EXISTS idx_action ON requests(action);
CREATE INDEX IF NOT EXISTS idx_risk_score ON requests(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_attack_type ON requests(attack_type);
CREATE INDEX IF NOT EXISTS idx_human_decision ON requests(human_decision);

-- IP reputation table
CREATE TABLE IF NOT EXISTS ip_reputation (
    ip_address INET PRIMARY KEY,
    
    -- Counters
    total_requests INTEGER DEFAULT 0,
    blocked_requests INTEGER DEFAULT 0,
    allowed_requests INTEGER DEFAULT 0,
    
    -- Scores
    reputation_score FLOAT DEFAULT 0.5, -- 0.0 (bad) to 1.0 (good)
    avg_risk_score FLOAT,
    
    -- Timing
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_blocked TIMESTAMPTZ,
    
    -- Geo data (cached)
    geo_country VARCHAR(2),
    geo_city VARCHAR(100),
    
    -- Metadata
    is_whitelisted BOOLEAN DEFAULT FALSE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Indexes for ip_reputation table
CREATE INDEX IF NOT EXISTS idx_reputation_score ON ip_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_last_seen ON ip_reputation(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_blacklisted ON ip_reputation(is_blacklisted);

-- Attack patterns table - stores identified attack signatures
CREATE TABLE IF NOT EXISTS attack_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL, -- SQL_INJECTION, XSS, etc.
    pattern TEXT NOT NULL,
    regex_pattern TEXT,
    severity VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for attack_patterns table
CREATE INDEX IF NOT EXISTS idx_pattern_type ON attack_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_active ON attack_patterns(is_active);

-- Training data for ML model
CREATE TABLE IF NOT EXISTS training_data (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id),
    
    -- Features (JSON for flexibility)
    features JSONB NOT NULL,
    
    -- Label
    is_malicious BOOLEAN NOT NULL,
    attack_type VARCHAR(50),
    
    -- Source
    labeled_by VARCHAR(20), -- HUMAN, AUTO, INITIAL
    confidence FLOAT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for training_data table
CREATE INDEX IF NOT EXISTS idx_is_malicious ON training_data(is_malicious);
CREATE INDEX IF NOT EXISTS idx_labeled_by ON training_data(labeled_by);
CREATE INDEX IF NOT EXISTS idx_created_at ON training_data(created_at DESC);

-- System statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    
    total_requests BIGINT DEFAULT 0,
    allowed_requests BIGINT DEFAULT 0,
    blocked_requests BIGINT DEFAULT 0,
    pending_requests BIGINT DEFAULT 0,
    
    avg_risk_score FLOAT,
    avg_latency_ms FLOAT,
    
    unique_ips INTEGER,
    new_ips INTEGER,
    
    attack_types JSONB, -- {"SQL_INJECTION": 50, "XSS": 30, ...}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Model performance metrics
CREATE TABLE IF NOT EXISTS model_metrics (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    
    -- Performance
    accuracy FLOAT,
    precision_score FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    false_positive_rate FLOAT,
    
    -- Metadata
    training_samples INTEGER,
    test_samples INTEGER,
    training_duration_sec INTEGER,
    
    deployed_at TIMESTAMPTZ,
    trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    is_active BOOLEAN DEFAULT FALSE
);

-- Indexes for model_metrics table
CREATE INDEX IF NOT EXISTS idx_deployed_at ON model_metrics(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_model ON model_metrics(is_active);

-- Function to update IP reputation
CREATE OR REPLACE FUNCTION update_ip_reputation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ip_reputation (ip_address, geo_country, geo_city)
    VALUES (NEW.source_ip, NEW.geo_country, NEW.geo_city)
    ON CONFLICT (ip_address) DO UPDATE SET
        total_requests = ip_reputation.total_requests + 1,
        blocked_requests = ip_reputation.blocked_requests + 
            CASE WHEN NEW.action = 'BLOCKED' THEN 1 ELSE 0 END,
        allowed_requests = ip_reputation.allowed_requests + 
            CASE WHEN NEW.action = 'ALLOWED' THEN 1 ELSE 0 END,
        last_seen = NEW.timestamp,
        last_blocked = CASE WHEN NEW.action = 'BLOCKED' THEN NEW.timestamp ELSE ip_reputation.last_blocked END,
        avg_risk_score = (
            COALESCE(ip_reputation.avg_risk_score * ip_reputation.total_requests, 0) + NEW.risk_score
        ) / (ip_reputation.total_requests + 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update IP reputation
CREATE TRIGGER trigger_update_ip_reputation
AFTER INSERT ON requests
FOR EACH ROW
EXECUTE FUNCTION update_ip_reputation();

-- Function to clean old data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_requests(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM requests
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep
    AND human_decision IS NULL; -- Keep human-reviewed data
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default attack patterns
INSERT INTO attack_patterns (pattern_type, pattern, severity) VALUES
    ('SQL_INJECTION', ''' OR ''1''=''1', 'CRITICAL'),
    ('SQL_INJECTION', 'UNION SELECT', 'CRITICAL'),
    ('SQL_INJECTION', 'DROP TABLE', 'CRITICAL'),
    ('SQL_INJECTION', '--', 'HIGH'),
    ('XSS', '<script>', 'HIGH'),
    ('XSS', 'javascript:', 'HIGH'),
    ('XSS', 'onerror=', 'MEDIUM'),
    ('PATH_TRAVERSAL', '../', 'HIGH'),
    ('PATH_TRAVERSAL', '..\\', 'HIGH'),
    ('SSRF', 'file://', 'HIGH'),
    ('SSRF', 'localhost', 'MEDIUM')
ON CONFLICT DO NOTHING;

-- Create initial statistics record
INSERT INTO statistics (date) VALUES (CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO waf_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO waf_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO waf_user;
