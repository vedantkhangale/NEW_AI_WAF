"""
Redis client for caching and IP reputation
"""

import redis.asyncio as aioredis
from typing import Optional, Dict, Any
import json
from loguru import logger


class RedisClient:
    """Async Redis client for caching"""
    
    def __init__(self, host: str, password: str, port: int = 6379):
        self.host = host
        self.port = port
        self.password = password
        self.client: Optional[aioredis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.client = await aioredis.from_url(
                f"redis://:{self.password}@{self.host}:{self.port}",
                encoding="utf-8",
                decode_responses=True
            )
            await self.client.ping()
            logger.info(f"Connected to Redis at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()
            logger.info("Disconnected from Redis")
    
    async def is_healthy(self) -> bool:
        """Check Redis health"""
        if not self.client:
            return False
        try:
            await self.client.ping()
            return True
        except:
            return False
    
    async def get_ip_reputation(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """Get IP reputation from cache"""
        try:
            key = f"ip_rep:{ip_address}"
            data = await self.client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting IP reputation: {e}")
            return None
    
    async def set_ip_reputation(self, ip_address: str, reputation: Dict[str, Any], ttl: int = 3600):
        """Set IP reputation in cache"""
        try:
            key = f"ip_rep:{ip_address}"
            await self.client.setex(key, ttl, json.dumps(reputation))
        except Exception as e:
            logger.error(f"Error setting IP reputation: {e}")
    
    async def get_ai_score_cache(self, request_hash: str) -> Optional[float]:
        """Get cached AI score for similar request"""
        try:
            key = f"ai_score:{request_hash}"
            score = await self.client.get(key)
            return float(score) if score else None
        except Exception as e:
            logger.error(f"Error getting AI score cache: {e}")
            return None
    
    async def set_ai_score_cache(self, request_hash: str, score: float, ttl: int = 300):
        """Cache AI score"""
        try:
            key = f"ai_score:{request_hash}"
            await self.client.setex(key, ttl, str(score))
        except Exception as e:
            logger.error(f"Error setting AI score cache: {e}")
    
    async def check_rate_limit(self, ip_address: str, limit: int = 100, window: int = 60) -> bool:
        """
        Check if IP is within rate limit
        Returns True if allowed, False if rate limit exceeded
        """
        try:
            key = f"rate_limit:{ip_address}"
            current = await self.client.get(key)
            
            if current is None:
                # First request in window
                await self.client.setex(key, window, "1")
                return True
            
            count = int(current)
            if count >= limit:
                return False  # Rate limit exceeded
            
            # Increment counter
            await self.client.incr(key)
            return True
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Fail open on error
    
    async def blacklist_ip(self, ip_address: str, ttl: int = 86400):
        """Add IP to blacklist (24 hours default)"""
        try:
            key = f"blacklist:{ip_address}"
            await self.client.setex(key, ttl, "1")
            logger.info(f"IP {ip_address} added to blacklist for {ttl} seconds")
        except Exception as e:
            logger.error(f"Error blacklisting IP: {e}")
    
    async def is_blacklisted(self, ip_address: str) -> bool:
        """Check if IP is blacklisted"""
        try:
            key = f"blacklist:{ip_address}"
            exists = await self.client.exists(key)
            return bool(exists)
        except Exception as e:
            logger.error(f"Error checking blacklist: {e}")
            return False
    async def whitelist_ip(self, ip_address: str):
        """Remove IP from blacklist"""
        try:
            key = f"blacklist:{ip_address}"
            await self.client.delete(key)
            logger.info(f"IP {ip_address} removed from blacklist")
        except Exception as e:
            logger.error(f"Error whitelisting IP: {e}")
