"""
Decision engine - coordinates AI analysis and makes final decisions
"""

import httpx
import hashlib
import json
import re
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger

from config import settings


class DecisionEngine:
    """WAF decision engine"""
    
    def __init__(self, ai_service_url: str, redis_client: Any, db_service: Any):
        self.ai_service_url = ai_service_url
        self.redis_client = redis_client
        self.db_service = db_service
    
    async def analyze(
        self,
        request: Any,
        geo_data: Dict[str, Any],
        ip_reputation: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze request and make decision
        Returns: {action, risk_score, reason, attack_type, blocked_by}
        """
        
        # Check if IP is blacklisted
        if self.redis_client:
            is_blacklisted = await self.redis_client.is_blacklisted(request.source_ip)
            if is_blacklisted:
                return {
                    'action': 'BLOCKED',
                    'risk_score': 1.0,
                    'reason': 'IP in blacklist',
                    'attack_type': 'BLACKLISTED',
                    'blocked_by': 'BLACKLIST'
                }
        
        # Check rate limit
        if self.redis_client:
            rate_ok = await self.redis_client.check_rate_limit(
                request.source_ip,
                limit=settings.RATE_LIMIT_REQUESTS,
                window=settings.RATE_LIMIT_WINDOW
            )
            if not rate_ok:
                return {
                    'action': 'BLOCKED',
                    'risk_score': 0.9,
                    'reason': 'Rate limit exceeded',
                    'attack_type': 'RATE_LIMIT',
                    'blocked_by': 'RATE_LIMITER'
                }
        
        # Generate request hash for caching
        request_hash = self._hash_request(request)
        
        # Check cache
        if self.redis_client:
            cached_score = await self.redis_client.get_ai_score_cache(request_hash)
            if cached_score is not None:
                return self._make_decision(cached_score, "Cached AI analysis", from_cache=True)
        
        # Check signatures (Fall-back/Pre-check)
        signature_result = self._check_signatures(request)
        if signature_result:
            return signature_result
        
        # Call AI service
        ai_result = await self._call_ai_service(request, geo_data, ip_reputation)
        
        if ai_result:
            # Cache the score
            if self.redis_client:
                await self.redis_client.set_ai_score_cache(
                    request_hash,
                    ai_result['risk_score'],
                    ttl=settings.MODEL_CACHE_TTL
                )
            
            return self._make_decision(
                ai_result['risk_score'],
                ai_result.get('reason', 'AI analysis'),
                attack_type=ai_result.get('attack_type'),
                features=ai_result.get('features'),
                risk_factors=ai_result.get('risk_factors')
            )
        else:
            # AI service failed - fail open
            if settings.FAIL_OPEN:
                return {
                    'action': 'ALLOWED',
                    'risk_score': 0.0,
                    'reason': 'AI service unavailable (fail-open)',
                    'blocked_by': 'NONE'
                }
            else:
                return {
                    'action': 'BLOCKED',
                    'risk_score': 1.0,
                    'reason': 'AI service unavailable (fail-closed)',
                    'blocked_by': 'FAILSAFE'
                }
    
    async def _call_ai_service(
        self,
        request: Any,
        geo_data: Dict[str, Any],
        ip_reputation: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Call AI service for risk assessment"""
        try:
            payload = {
                'method': request.method,
                'uri': request.uri,
                'query_string': request.query_string or '',
                'headers': request.headers,
                'body': request.body or '',
                'source_ip': request.source_ip,
                'geo_country': geo_data.get('country_code'),
                'ip_reputation': ip_reputation['reputation_score'] if ip_reputation else 0.5
            }
            
            async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{self.ai_service_url}/analyze",
                    json=payload
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"AI service returned {response.status_code}")
                    return None
        except httpx.TimeoutException:
            logger.error("AI service timeout")
            return None
        except Exception as e:
            logger.error(f"Error calling AI service: {e}")
            return None
    
    def _make_decision(
        self,
        risk_score: float,
        reason: str,
        attack_type: Optional[str] = None,
        features: Optional[Dict] = None,
        risk_factors: Optional[Dict] = None,
        from_cache: bool = False
    ) -> Dict[str, Any]:
        """
        Make final decision based on risk score
        
        Thresholds:
        - < 0.3: Auto-allow
        - 0.3-0.7: Pending (human review)
        - > 0.7: Auto-block
        """
        if risk_score < settings.AI_THRESHOLD_LOW:
            action = 'ALLOWED'
            blocked_by = 'NONE'
        elif risk_score > settings.AI_THRESHOLD_HIGH:
            action = 'BLOCKED'
            blocked_by = 'AI'
        else:
            # Medium risk - queue for human review
            action = 'PENDING'
            blocked_by = 'NONE'
            reason += ' (queued for human review)'
        
        # Dry Run Mode Override
        if settings.DRY_RUN and action == 'BLOCKED':
            action = 'ALLOWED'
            reason += ' (Allowed by Dry Run Mode)'
        
        return {
            'action': action,
            'risk_score': risk_score,
            'reason': reason,
            'attack_type': attack_type,
            'blocked_by': blocked_by,
            'features': features or {},
            'risk_factors': risk_factors or {},
            'from_cache': from_cache
        }
    
    def _hash_request(self, request: Any) -> str:
        """Generate hash for request caching"""
        content = f"{request.method}{request.uri}{request.body or ''}"
        return hashlib.md5(content.encode()).hexdigest()

    def _check_signatures(self, request: Any) -> Optional[Dict[str, Any]]:
        """Check request against known attack signatures"""
        
        # Common attack patterns (fallback if AI misses them)
        signatures = [
            # SSRF - Cloud Metadata Endpoints
            (r'169\.254\.169\.254', 'SSRF', 'CRITICAL'),  # AWS/Azure/GCP metadata
            (r'metadata\.google\.internal', 'SSRF', 'CRITICAL'),  # GCP
            (r'169\.254\.169\.253', 'SSRF', 'CRITICAL'),  # Azure
            
            # SSRF - Localhost/Internal Access
            (r'localhost', 'SSRF', 'HIGH'),
            (r'127\.0\.0\.\d+', 'SSRF', 'HIGH'),
            (r'0\.0\.0\.0', 'SSRF', 'HIGH'),
            (r'::1', 'SSRF', 'HIGH'),  # IPv6 localhost
            
            # SSRF - Private IP Ranges
            (r'10\.\d+\.\d+\.\d+', 'SSRF', 'HIGH'),  # 10.0.0.0/8
            (r'172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+', 'SSRF', 'HIGH'),  # 172.16.0.0/12
            (r'192\.168\.\d+\.\d+', 'SSRF', 'HIGH'),  # 192.168.0.0/16
            
            # SSRF - Protocol-based
            (r'file://', 'SSRF', 'CRITICAL'),
            (r'gopher://', 'SSRF', 'CRITICAL'),
            (r'dict://', 'SSRF', 'CRITICAL'),
            (r'ftp://', 'SSRF', 'HIGH'),
            (r'tftp://', 'SSRF', 'HIGH'),
            
            # Path Traversal
            (r'\.\./\.\./', 'PATH_TRAVERSAL', 'HIGH'),
            (r'/etc/passwd', 'LFI', 'CRITICAL'),
            (r'/windows/win.ini', 'LFI', 'CRITICAL'),
            
            # XSS
            (r'<script>', 'XSS', 'CRITICAL'),
            (r'javascript:', 'XSS', 'CRITICAL'),
            (r'<img\s+[^>]*onerror', 'XSS', 'CRITICAL'),
            (r'<svg\s+[^>]*onload', 'XSS', 'CRITICAL'),
            (r'<iframe', 'XSS', 'HIGH'),
            (r'on\w+\s*=', 'XSS', 'HIGH'),  # Generic event handler
            (r'alert\(', 'XSS', 'MEDIUM'),
            (r'document\.cookie', 'XSS', 'CRITICAL'),
            
            # SQL Injection
            (r'UNION\s+SELECT', 'SQL_INJECTION', 'CRITICAL'),
            (r'UNION\s+ALL\s+SELECT', 'SQL_INJECTION', 'CRITICAL'),
            (r'DROP\s+TABLE', 'SQL_INJECTION', 'CRITICAL'),
            (r'OR\s+[\'"]?[\w]+[\'"]?\s*=\s*[\'"]?[\w]+[\'"]?', 'SQL_INJECTION', 'HIGH'),
            (r'1\s*=\s*1', 'SQL_INJECTION', 'HIGH'),
            (r'--', 'SQL_INJECTION', 'MEDIUM'),
            (r';', 'SQL_INJECTION', 'MEDIUM'),
        ]
        
        # Check URI and Query String
        check_targets = [request.uri, request.query_string or "", request.body or ""]
        
        for pattern, attack_type, severity in signatures:
            for target in check_targets:
                if re.search(pattern, target, re.IGNORECASE):
                    return {
                        'action': 'BLOCKED',
                        'risk_score': 1.0 if severity == 'CRITICAL' else 0.8,
                        'reason': f"Matched signature: {attack_type}",
                        'attack_type': attack_type,
                        'blocked_by': 'SIGNATURE',
                        'features': {'pattern_match': pattern},
                        'risk_factors': {'signature_match': True}
                    }
        return None
