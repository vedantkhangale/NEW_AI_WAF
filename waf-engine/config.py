"""
Configuration settings for AegisX WAF Engine
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://waf_user:waf_secure_pass_2026@postgres:5432/aegisx_waf"
    )
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "redis_secure_2026")
    
    # AI Service
    AI_SERVICE_URL: str = os.getenv("AI_SERVICE_URL", "http://ai-service:5001")
    
    # GeoIP
    GEOIP_DB_PATH: str = "/app/geoip/GeoLite2-City.mmdb"
    
    # Server location (for map visualization)
    SERVER_LAT: float = float(os.getenv("SERVER_LAT", "18.5204"))
    SERVER_LON: float = float(os.getenv("SERVER_LON", "73.8567"))
    
    # AI Thresholds
    AI_THRESHOLD_LOW: float = float(os.getenv("AI_THRESHOLD_LOW", "0.3"))
    AI_THRESHOLD_HIGH: float = float(os.getenv("AI_THRESHOLD_HIGH", "0.7"))
    
    # Caching
    MODEL_CACHE_TTL: int = int(os.getenv("MODEL_CACHE_TTL", "300"))  # 5 minutes
    IP_REPUTATION_TTL: int = int(os.getenv("IP_REPUTATION_TTL", "3600"))  # 1 hour
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "5"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
    # Timeouts
    AI_REQUEST_TIMEOUT: int = 5  # seconds
    AI_REQUEST_TIMEOUT: int = 5  # seconds
    FAIL_OPEN: bool = True  # Allow traffic if AI service fails
    DRY_RUN: bool = False   # If True, log blocks but allow traffic
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
