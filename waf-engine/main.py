"""
AegisX WAF Engine - Main FastAPI Application
Production-grade Web Application Firewall backend
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
import json

from pydantic import BaseModel, Field
from loguru import logger

# Import services
from services.database import DatabaseService
from services.geoip_resolver import GeoIPResolver
from services.decision_engine import DecisionEngine
from services.redis_client import RedisClient
from services.websocket_manager import WebSocketManager

# Configuration
from config import settings

# ============================================================================
# Lifespan Context Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting AegisX WAF Engine...")
    
    # Initialize services
    await app.state.db.connect()
    await app.state.redis.connect()
    app.state.geoip.load_database()
    
    logger.info("All services initialized successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down AegisX WAF Engine...")
    await app.state.db.disconnect()
    await app.state.redis.disconnect()
    logger.info("Shutdown complete")

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="AegisX WAF Engine",
    description="AI-Powered Web Application Firewall - Decision Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
app.state.db = DatabaseService(settings.DATABASE_URL)
app.state.redis = RedisClient(settings.REDIS_HOST, settings.REDIS_PASSWORD)
app.state.geoip = GeoIPResolver(settings.GEOIP_DB_PATH)
app.state.decision_engine = DecisionEngine(
    ai_service_url=settings.AI_SERVICE_URL,
    redis_client=None,  # Will be set after startup
    db_service=None
)
app.state.ws_manager = WebSocketManager()

# ============================================================================
# Pydantic Models
# ============================================================================

class RequestMetadata(BaseModel):
    """Request metadata from Nginx"""
    source_ip: str
    method: str
    uri: str
    query_string: Optional[str] = ""
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[str] = ""
    timestamp: Optional[datetime] = None

class AnalysisResponse(BaseModel):
    """WAF decision response"""
    action: str  # ALLOW, BLOCK, PENDING
    risk_score: float
    reason: str
    attack_type: Optional[str] = None
    decision_id: int
    latency_ms: int

class HumanFeedback(BaseModel):
    """Human review decision"""
    request_id: int
    decision: str  # ALLOW, BLOCK
    reviewer: str = "human"
    notes: Optional[str] = ""

class RequestQuery(BaseModel):
    """Query parameters for request listing"""
    limit: int = 100
    offset: int = 0
    action: Optional[str] = None
    min_risk_score: Optional[float] = None

# ============================================================================
# Routes
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": await app.state.db.is_healthy(),
            "redis": await app.state.redis.is_healthy(),
            "geoip": app.state.geoip.is_loaded()
        }
    }

@app.post("/api/analyze_request", response_model=AnalysisResponse)
async def analyze_request(request: RequestMetadata):
    """
    Main WAF analysis endpoint - called by Nginx
    Returns decision: ALLOW, BLOCK, or PENDING
    """
    start_time = datetime.utcnow()
    
    try:
        # Resolve GeoIP
        geo_data = app.state.geoip.resolve(request.source_ip)
        
        # Check Redis cache for IP reputation
        ip_reputation = await app.state.redis.get_ip_reputation(request.source_ip)
        
        print(f"DEBUG: Analyzed request from {request.source_ip}")
        print(f"DEBUG: Headers: {dict(request.headers)}")
        
        # Check rate limit
        is_allowed = await app.state.redis.check_rate_limit(
            ip_address=request.source_ip,
            limit=settings.RATE_LIMIT_REQUESTS,
            window=settings.RATE_LIMIT_WINDOW
        )
        
        if not is_allowed:
            # Create blocking decision immediately
            latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            decision = {
                "action": "BLOCK",
                "risk_score": 1.0,
                "reason": "Rate limit exceeded",
                "attack_type": "Rate Limiting",
                "blocked_by": "Redis",
                "latency_ms": latency_ms
            }
            
            # Store in database
            decision_id = await app.state.db.store_request(
                request=request,
                geo_data=geo_data,
                decision=decision
            )
            decision['decision_id'] = decision_id
            
            # Broadcast
            await app.state.ws_manager.broadcast({
                "type": "new_request",
                "data": {
                    **decision,
                    "source_ip": request.source_ip,
                    "method": request.method,
                    "uri": request.uri,
                    "timestamp": start_time.isoformat(),
                    "geo_lat": geo_data.get('latitude'),
                    "geo_lon": geo_data.get('longitude'),
                    "geo_country": geo_data.get('country_code'),
                    "geo_city": geo_data.get('city'),
                    "headers": dict(request.headers),
                    "full_body": request.body
                }
            })
            
            logger.warning(f"Rate limit exceeded for {request.source_ip}")
            return AnalysisResponse(**decision)
        
        # Get AI decision
        decision_engine = DecisionEngine(
            ai_service_url=settings.AI_SERVICE_URL,
            redis_client=app.state.redis,
            db_service=app.state.db
        )
        
        decision = await decision_engine.analyze(
            request=request,
            geo_data=geo_data,
            ip_reputation=ip_reputation
        )
        
        # Calculate latency
        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        decision['latency_ms'] = latency_ms
        
        # Store in database
        decision_id = await app.state.db.store_request(
            request=request,
            geo_data=geo_data,
            decision=decision
        )
        decision['decision_id'] = decision_id
        
        # Broadcast to WebSocket clients
        await app.state.ws_manager.broadcast({
            "type": "new_request",
            "data": {
                **decision,
                "source_ip": request.source_ip,
                "method": request.method,
                "uri": request.uri,
                "timestamp": start_time.isoformat(),
                "geo_lat": geo_data.get('latitude'),
                "geo_lon": geo_data.get('longitude'),
                "geo_country": geo_data.get('country_code'),
                "geo_city": geo_data.get('city')
            }
        })
        
        logger.info(
            f"Request analyzed: {request.source_ip} -> {decision['action']} "
            f"(score: {decision['risk_score']:.2f}, latency: {latency_ms}ms)"
        )
        
        return AnalysisResponse(**decision)
        
    except Exception as e:
        logger.error(f"Error analyzing request: {e}")
        # Fail-open: allow request but log error
        return AnalysisResponse(
            action="ALLOW",
            risk_score=0.0,
            reason=f"WAF error (fail-open): {str(e)}",
            decision_id=0,
            latency_ms=0
        )

@app.get("/api/requests")
async def get_requests(
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
    min_risk_score: Optional[float] = None
):
    """Get request logs with filtering"""
    try:
        requests = await app.state.db.get_requests(
            limit=limit,
            offset=offset,
            action=action,
            min_risk_score=min_risk_score
        )
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        logger.error(f"Error fetching requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/requests/pending")
async def get_pending_requests():
    """Get requests pending human review"""
    try:
        requests = await app.state.db.get_requests(action="PENDING", limit=50)
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        logger.error(f"Error fetching pending requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback")
async def submit_feedback(feedback: HumanFeedback):
    """Submit human decision for a request"""
    try:
        # Update request with human decision
        await app.state.db.update_human_decision(
            request_id=feedback.request_id,
            decision=feedback.decision,
            reviewer=feedback.reviewer,
            notes=feedback.notes
        )
        
        # Add to training data
        await app.state.db.add_training_data(
            request_id=feedback.request_id,
            is_malicious=(feedback.decision == "BLOCK"),
            labeled_by="HUMAN"
        )
        
        logger.info(f"Human feedback recorded: request_id={feedback.request_id}, decision={feedback.decision}")
        
        return {"status": "success", "message": "Feedback recorded"}
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_statistics():
    """Get current statistics"""
    try:
        stats = await app.state.db.get_statistics()
        # Calculate block rate
        if stats.get('total_requests', 0) > 0:
            stats['block_rate'] = round((stats.get('blocked_requests', 0) / stats.get('total_requests', 1)) * 100, 1)
            stats['high_severity'] = stats.get('blocked_requests', 0) # Approximation for now
        else:
            stats['block_rate'] = 0
            stats['high_severity'] = 0
            
        return {
            "total_requests": stats.get('total_requests', 0),
            "blocked": stats.get('blocked_requests', 0),
            "allowed": stats.get('allowed_requests', 0),
            "block_rate": stats['block_rate'],
            "high_severity": stats['high_severity']
        }
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/top-ips")
async def get_top_ips():
    """Get top attacking IPs"""
    try:
        return await app.state.db.get_top_attacking_ips()
    except Exception as e:
        logger.error(f"Error fetching top IPs: {e}")
        return []

@app.get("/api/recent-events")
async def get_recent_events():
    """Get recent high severity events"""
    try:
        return await app.state.db.get_recent_high_severity_events()
    except Exception as e:
        logger.error(f"Error fetching recent events: {e}")
        return []

@app.get("/api/v1/stats/aggregate")
async def get_aggregate_statistics(range: str = "1h"):
    """Get aggregated time-series statistics for analytics dashboard"""
    try:
        from services.analytics import get_aggregate_stats
        stats = await get_aggregate_stats(app.state.db.pool, range)
        return stats
    except Exception as e:
        logger.error(f"Error fetching aggregate statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ip/{ip_address}")
async def get_ip_info(ip_address: str):
    """Get information about a specific IP"""
    try:
        # Get from database
        ip_info = await app.state.db.get_ip_reputation(ip_address)
        
        # Get GeoIP data
        geo_data = app.state.geoip.resolve(ip_address)
        
        return {
            **ip_info,
            "geo_data": geo_data
        }
    except Exception as e:
        logger.error(f"Error fetching IP info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/retrain")
async def trigger_retrain():
    """Trigger AI model retraining"""
    try:
        # Make request to AI service
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{settings.AI_SERVICE_URL}/retrain")
            return response.json()
    except Exception as e:
        logger.error(f"Error triggering retrain: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback")
async def submit_feedback(feedback: HumanFeedback):
    """Submit human decision for a request"""
# ============================================================================

class BlacklistRequest(BaseModel):
    ip_address: str
    ttl: int = 86400  # 24 hours
    reason: Optional[str] = "Manual block"

class WhitelistRequest(BaseModel):
    ip_address: str
    reason: Optional[str] = "Manual unban"

@app.post("/api/blacklist")
async def blacklist_ip(request: BlacklistRequest):
    """Manually blacklist an IP"""
    try:
        await app.state.redis.blacklist_ip(request.ip_address, request.ttl)
        logger.info(f"Manual blacklist: {request.ip_address}")
        return {"status": "success", "message": f"IP {request.ip_address} blacklisted"}
    except Exception as e:
        logger.error(f"Error blacklisting IP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whitelist")
async def whitelist_ip(request: WhitelistRequest):
    """Manually whitelist (unban) an IP"""
    try:
        await app.state.redis.whitelist_ip(request.ip_address)
        logger.info(f"Manual whitelist: {request.ip_address}")
        return {"status": "success", "message": f"IP {request.ip_address} whitelisted"}
    except Exception as e:
        logger.error(f"Error whitelisting IP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates to dashboard"""
    await app.state.ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_text()
            # Echo for connection check
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        app.state.ws_manager.disconnect(websocket)

# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        workers=4,
        log_level="info"
    )
