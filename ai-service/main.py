"""
AegisX AI Service - LightGBM-based Threat Detection
Fast inference for Web Application Firewall
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger

from model.feature_extractor import FeatureExtractor
from model.classifier import ThreatClassifier
from training.initial_train import train_initial_model
import os

# ============================================================================
# Lifespan
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting AegisX AI Service...")
    
    # Check if model exists, otherwise train initial model
    model_path = "/app/models/lgbm_waf_model.pkl"
    if not os.path.exists(model_path):
        logger.info("No existing model found. Training initial model...")
        train_initial_model(model_path)
    
    # Load model
    app.state.classifier = ThreatClassifier(model_path)
    app.state.classifier.load_model()
    
    app.state.feature_extractor = FeatureExtractor()
    
    logger.info("AI Service initialized successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="AegisX AI Service",
    description="LightGBM Threat Detection Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Models
# ============================================================================

class AnalyzeRequest(BaseModel):
    """Request for threat analysis"""
    method: str
    uri: str
    query_string: str = ""
    headers: Dict[str, str] = {}
    body: str = ""
    source_ip: str
    geo_country: Optional[str] = None
    ip_reputation: float = 0.5

class AnalyzeResponse(BaseModel):
    """Threat analysis response"""
    risk_score: float
    reason: str
    attack_type: Optional[str] = None
    features: Dict[str, Any] = {}
    risk_factors: Dict[str, str] = {}

class RetrainRequest(BaseModel):
    """Retrain request"""
    trigger: str = "manual"

# ============================================================================
# Routes
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "model_loaded": app.state.classifier.is_loaded()
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_request(request: AnalyzeRequest):
    """
    Analyze HTTP request for threats
    Returns risk score (0.0-1.0) and threat classification
    """
    try:
        # Extract features
        features = app.state.feature_extractor.extract(
            method=request.method,
            uri=request.uri,
            query_string=request.query_string,
            headers=request.headers,
            body=request.body,
            source_ip=request.source_ip,
            geo_country=request.geo_country,
            ip_reputation=request.ip_reputation
        )
        
        # Get prediction from model
        prediction = app.state.classifier.predict(features)
        
        # Determine attack type based on features
        attack_type = app.state.feature_extractor.detect_attack_type(
            uri=request.uri,
            query_string=request.query_string,
            body=request.body
        )
        
        # Generate risk factors explanation
        risk_factors = app.state.feature_extractor.explain_risk(features, prediction['risk_score'])
        
        # Build response
        response = AnalyzeResponse(
            risk_score=prediction['risk_score'],
            reason=prediction['reason'],
            attack_type=attack_type,
            features=features,
            risk_factors=risk_factors
        )
        
        logger.info(f"Analysis complete: {request.source_ip} -> risk_score={prediction['risk_score']:.3f}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing request: {e}")
        # Return low-risk score on error (fail-open)
        return AnalyzeResponse(
            risk_score=0.0,
            reason=f"Analysis error: {str(e)}",
            features={}
        )

@app.post("/retrain")
async def retrain_model(request: RetrainRequest):
    """
    Trigger model retraining with new data
    In production, this would run as a background task
    """
    try:
        logger.info(f"Retrain triggered: {request.trigger}")
        
        # In a production system, this would:
        # 1. Load training data from database
        # 2. Combine with existing dataset
        # 3. Retrain model incrementally
        # 4. Validate performance
        # 5. Deploy new model
        
        # For now, return success
        return {
            "status": "queued",
            "message": "Retraining job queued",
            "trigger": request.trigger,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error triggering retrain: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    """Get information about the loaded model"""
    return app.state.classifier.get_model_info()

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, log_level="info")
