"""
Database aggregation queries for analytics
"""

async def get_aggregate_stats(pool, time_range: str = "1h") -> dict:
    """Get aggregated statistics over time range"""
    
    # Convert time range to PostgreSQL interval
    interval_map = {
        "15m": "15 minutes",
        "1h": "1 hour",
        "24h": "24 hours",
        "7d": "7 days"
    }
    
    interval = interval_map.get(time_range, "1 hour")
    
    # Determine bucket size based on range
    bucket_map = {
        "15m": "1 minute",
        "1h": "5 minutes",
        "24h": "1 hour",
        "7d": "6 hours"
    }
    bucket = bucket_map.get(time_range, "5 minutes")
    
    async with pool.acquire() as conn:
        # Traffic volume over time
        traffic_volume = await conn.fetch(f"""
            SELECT 
                date_trunc('{bucket}', timestamp) AS time,
                COUNT(*) AS total_requests,
                COUNT(*) FILTER (WHERE action = 'BLOCKED') AS blocked_requests,
                COUNT(*) FILTER (WHERE action = 'ALLOWED') AS allowed_requests
            FROM requests
            WHERE timestamp >= NOW() - INTERVAL '{interval}'
            GROUP BY date_trunc('{bucket}', timestamp)
            ORDER BY time
        """)
        
        # Latency over time
        latency_data = await conn.fetch(f"""
            SELECT 
                date_trunc('{bucket}', timestamp) AS time,
                AVG(decision_latency_ms) AS avg_latency,
                MAX(decision_latency_ms) AS max_latency
            FROM requests
            WHERE timestamp >= NOW() - INTERVAL '{interval}'
                AND decision_latency_ms IS NOT NULL
            GROUP BY date_trunc('{bucket}', timestamp)
            ORDER BY time
        """)
        
        # Attack type distribution
        attack_distribution = await conn.fetch(f"""
            SELECT 
                COALESCE(attack_type, 'Unknown') AS attack_type,
                COUNT(*) as count
            FROM requests
            WHERE timestamp >= NOW() - INTERVAL '{interval}'
                AND action = 'BLOCKED'
            GROUP BY attack_type
            ORDER BY count DESC
            LIMIT 10
        """)
        
        # Overall summary
        summary = await conn.fetchrow(f"""
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE action = 'BLOCKED') as blocked_requests,
                COUNT(*) FILTER (WHERE action = 'ALLOWED') as allowed_requests,
                AVG(decision_latency_ms) as avg_latency,
                MAX(decision_latency_ms) as max_latency,
                COUNT(DISTINCT source_ip) as unique_ips
            FROM requests
            WHERE timestamp >= NOW() - INTERVAL '{interval}'
        """)
        
        return {
            "time_range": time_range,
            "summary": dict(summary) if summary else {},
            "traffic_volume": [dict(row) for row in traffic_volume],
            "latency_data": [dict(row) for row in latency_data],
            "attack_distribution": [dict(row) for row in attack_distribution]
        }
