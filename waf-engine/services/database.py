"""
Database service for AegisX WAF
Handles all PostgreSQL interactions
"""

import asyncpg
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from loguru import logger


class DatabaseService:
    """Async PostgreSQL database service"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,
                max_size=20,
                command_timeout=60
            )
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def is_healthy(self) -> bool:
        """Check database health"""
        if not self.pool:
            return False
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except:
            return False
    
    async def store_request(
        self,
        request: Any,
        geo_data: Dict[str, Any],
        decision: Dict[str, Any]
    ) -> int:
        """Store request in database"""
        try:
            async with self.pool.acquire() as conn:
                request_id = await conn.fetchval("""
                    INSERT INTO requests (
                        source_ip, method, uri, query_string, user_agent,
                        referer, content_type, content_length, body_sample, full_body,
                        geo_country, geo_city, geo_lat, geo_lon,
                        risk_score, risk_factors, features,
                        action, attack_type, blocked_by, decision_latency_ms,
                        headers
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                        $11, $12, $13, $14,
                        $15, $16, $17, $18, $19, $20, $21, $22
                    ) RETURNING id
                """,
                    request.source_ip,
                    request.method,
                    request.uri,
                    request.query_string or "",
                    request.headers.get('user-agent', ''),
                    request.headers.get('referer', ''),
                    request.headers.get('content-type', ''),
                    len(request.body) if request.body else 0,
                    request.body[:10000] if request.body else "",  # Sample
                    request.body if request.body else "",  # Full body
                    geo_data.get('country_code'),
                    geo_data.get('city'),
                    geo_data.get('latitude'),
                    geo_data.get('longitude'),
                    decision.get('risk_score', 0.0),
                    json.dumps(decision.get('risk_factors', {})),
                    json.dumps(decision.get('features', {})),
                    decision.get('action', 'ALLOWED'),
                    decision.get('attack_type'),
                    decision.get('blocked_by', 'AI'),
                    decision.get('latency_ms', 0),
                    json.dumps(dict(request.headers))
                )
                return request_id
        except Exception as e:
            logger.error(f"Error storing request: {e}")
            return 0
    
    async def get_requests(
        self,
        limit: int = 100,
        offset: int = 0,
        action: Optional[str] = None,
        min_risk_score: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Get requests with filtering"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT 
                        id, timestamp, source_ip, method, uri,
                        geo_country, geo_city, geo_lat, geo_lon,
                        risk_score, action, attack_type, blocked_by,
                        human_decision, decision_latency_ms,
                        headers, full_body
                    FROM requests
                    WHERE 1=1
                """
                params = []
                param_count = 0
                
                if action:
                    param_count += 1
                    query += f" AND action = ${param_count}"
                    params.append(action)
                
                if min_risk_score is not None:
                    param_count += 1
                    query += f" AND risk_score >= ${param_count}"
                    params.append(min_risk_score)
                
                query += f" ORDER BY timestamp DESC LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
                params.extend([limit, offset])
                
                rows = await conn.fetch(query, *params)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching requests: {e}")
            return []
    
    async def update_human_decision(
        self,
        request_id: int,
        decision: str,
        reviewer: str,
        notes: Optional[str] = None
    ):
        """Update request with human decision"""
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    UPDATE requests
                    SET human_decision = $1,
                        human_reviewed_at = NOW(),
                        human_reviewer = $2,
                        human_notes = $3,
                        action = CASE 
                            WHEN $1 = 'BLOCK' THEN 'BLOCKED'
                            WHEN $1 = 'ALLOW' THEN 'ALLOWED'
                            ELSE action
                        END
                    WHERE id = $4
                """, decision, reviewer, notes, request_id)
                logger.info(f"Human decision recorded for request {request_id}: {decision}")
        except Exception as e:
            logger.error(f"Error updating human decision: {e}")
            raise
    
    async def add_training_data(
        self,
        request_id: int,
        is_malicious: bool,
        labeled_by: str = "HUMAN"
    ):
        """Add request to training dataset"""
        try:
            async with self.pool.acquire() as conn:
                # Get request features
                features = await conn.fetchval("""
                    SELECT features FROM requests WHERE id = $1
                """, request_id)
                
                # Get attack type
                attack_type = await conn.fetchval("""
                    SELECT attack_type FROM requests WHERE id = $1
                """, request_id)
                
                # Insert into training_data
                await conn.execute("""
                    INSERT INTO training_data (
                        request_id, features, is_malicious, attack_type, labeled_by
                    ) VALUES ($1, $2, $3, $4, $5)
                """, request_id, features, is_malicious, attack_type, labeled_by)
                
                logger.info(f"Added request {request_id} to training data")
        except Exception as e:
            logger.error(f"Error adding training data: {e}")
            raise
    
    async def get_ip_reputation(self, ip_address: str) -> Dict[str, Any]:
        """Get IP reputation from database"""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT * FROM ip_reputation WHERE ip_address = $1
                """, ip_address)
                
                if row:
                    return dict(row)
                return {
                    "total_requests": 0,
                    "blocked_requests": 0,
                    "reputation_score": 0.5
                }
        except Exception as e:
            logger.error(f"Error fetching IP reputation: {e}")
            return {"total_requests": 0, "blocked_requests": 0, "reputation_score": 0.5}
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get current statistics"""
        try:
            async with self.pool.acquire() as conn:
                # Today's stats
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_requests,
                        COUNT(*) FILTER (WHERE action = 'ALLOWED') as allowed_requests,
                        COUNT(*) FILTER (WHERE action = 'BLOCKED') as blocked_requests,
                        COUNT(*) FILTER (WHERE action = 'PENDING') as pending_requests,
                        AVG(risk_score) as avg_risk_score,
                        AVG(decision_latency_ms) as avg_latency_ms,
                        COUNT(DISTINCT source_ip) as unique_ips
                    FROM requests
                    WHERE DATE(timestamp) = CURRENT_DATE
                """)
                
                # Attack type breakdown
                attack_types = await conn.fetch("""
                    SELECT attack_type, COUNT(*) as count
                    FROM requests
                    WHERE DATE(timestamp) = CURRENT_DATE
                    AND attack_type IS NOT NULL
                    GROUP BY attack_type
                    ORDER BY count DESC
                    LIMIT 10
                """)
                
                # Top attacking IPs
                top_ips = await conn.fetch("""
                    SELECT source_ip, COUNT(*) as attack_count
                    FROM requests
                    WHERE DATE(timestamp) = CURRENT_DATE
                    AND action = 'BLOCKED'
                    GROUP BY source_ip
                    ORDER BY attack_count DESC
                    LIMIT 10
                """)
                
                return {
                    **dict(stats),
                    "attack_types": [dict(row) for row in attack_types],
                    "top_attacking_ips": [dict(row) for row in top_ips]
                }
        except Exception as e:
            logger.error(f"Error fetching statistics: {e}")
            return {}
    async def get_top_attacking_ips(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top attacking IPs with details"""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT 
                        source_ip as ip,
                        geo_country as country,
                        COALESCE(geo_country, 'XX') as country_code,
                        COUNT(*) as request_count,
                        CASE 
                            WHEN COUNT(*) > 1000 THEN 'critical'
                            WHEN COUNT(*) > 100 THEN 'high'
                            WHEN COUNT(*) > 50 THEN 'medium'
                            ELSE 'low'
                        END as threat_level
                    FROM requests
                    WHERE action = 'BLOCKED'
                    AND DATE(timestamp) >= CURRENT_DATE - INTERVAL '24 hours'
                    GROUP BY source_ip, geo_country
                    ORDER BY request_count DESC
                    LIMIT $1
                """, limit)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching top IPs: {e}")
            return []

    async def get_recent_high_severity_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent high severity events"""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT 
                        id::text,
                        timestamp,
                        method,
                        uri,
                        attack_type,
                        action,
                        headers,
                        full_body,
                        CASE 
                            WHEN risk_score >= 0.9 THEN 'critical'
                            WHEN risk_score >= 0.7 THEN 'high'
                            WHEN risk_score >= 0.5 THEN 'medium'
                            ELSE 'low'
                        END as severity
                    FROM requests
                    WHERE risk_score >= 0.5
                    ORDER BY timestamp DESC
                    LIMIT $1
                """, limit)
                
                # Convert timestamp to ISO format string
                result = []
                for row in rows:
                    item = dict(row)
                    if isinstance(item['timestamp'], datetime):
                        item['timestamp'] = item['timestamp'].isoformat()
                    result.append(item)
                return result
        except Exception as e:
            logger.error(f"Error fetching recent events: {e}")
            return []
