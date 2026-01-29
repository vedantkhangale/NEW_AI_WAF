"""
Feature extraction for WAF threat detection
Extracts numerical features from HTTP requests for ML model
"""

import re
import math
from typing import Dict, Any
from collections import Counter
from urllib.parse import unquote


class FeatureExtractor:
    """Extracts features from HTTP requests"""
    
    # Attack patterns
    SQL_KEYWORDS = [
        'union', 'select', 'insert', 'update', 'delete', 'drop', 'create',
        'alter', 'exec', 'execute', 'script', 'javascript', 'eval', 'expression',
        'from', 'where', 'having', 'group', 'order', 'limit', 'offset',
        '--', '/*', '*/', 'xp_', 'sp_', 'char(', 'concat', 'waitfor'
    ]
    
    XSS_PATTERNS = [
        r'<script[^>]*>',
        r'javascript:',
        r'onerror\s*=',
        r'onload\s*=',
        r'onclick\s*=',
        r'<iframe',
        r'<embed',
        r'<object',
        r'alert\(',
        r'document\.cookie',
        r'window\.location'
    ]
    
    PATH_TRAVERSAL_PATTERNS = [
        '../', '..\\', '%2e%2e/', '%2e%2e\\',
        '..../', '....\\',
        '/etc/passwd', '/etc/shadow', 'c:\\windows',
        'file://', 'gopher://'
    ]
    
    def extract(
        self,
        method: str,
        uri: str,
        query_string: str,
        headers: Dict[str, str],
        body: str,
        source_ip: str,
        geo_country: str = None,
        ip_reputation: float = 0.5
    ) -> Dict[str, Any]:
        """
        Extract all features from request
        Returns dictionary of numerical features
        """
        
        # Combine all text for analysis
        full_text = f"{uri} {query_string} {body}".lower()
        
        features = {
            # Basic features
            'method_is_post': 1 if method == 'POST' else 0,
            'method_is_get': 1 if method == 'GET' else 0,
            'uri_length': len(uri),
            'query_length': len(query_string),
            'body_length': len(body),
            'total_length': len(full_text),
            
            # Path features
            'path_depth': uri.count('/'),
            'has_query': 1 if query_string else 0,
            'num_params': query_string.count('&') + 1 if query_string else 0,
            
            # Encoding features
            'url_encoded_chars': self._count_url_encoded(full_text),
            'hex_encoded_chars': self._count_hex_encoded(full_text),
            'unicode_chars': self._count_unicode(full_text),
            'non_ascii_ratio': self._non_ascii_ratio(full_text),
            
            # Entropy (randomness)
            'entropy': self._calculate_entropy(full_text),
            'uri_entropy': self._calculate_entropy(uri),
            
            # SQL Injection features
            'sql_keyword_count': self._count_sql_keywords(full_text),
            'sql_keyword_density': self._sql_keyword_density(full_text),
            'has_sql_comment': 1 if ('--' in full_text or '/*' in full_text) else 0,
            'has_union': 1 if 'union' in full_text else 0,
            'has_select': 1 if 'select' in full_text else 0,
            'has_quotes': full_text.count("'") + full_text.count('"'),
            
            # XSS features
            'xss_pattern_count': self._count_xss_patterns(full_text),
            'has_script_tag': 1 if '<script' in full_text else 0,
            'has_javascript': 1 if 'javascript:' in full_text else 0,
            'has_event_handler': self._has_event_handler(full_text),
            'html_tag_count': full_text.count('<'),
            
            # Path Traversal features
            'has_dot_dot': 1 if ('..' in full_text) else 0,
            'path_traversal_count': self._count_path_traversal(full_text),
            'has_file_protocol': 1 if ('file://' in full_text or 'gopher://' in full_text) else 0,
            
            # Special characters
            'special_char_count': self._count_special_chars(full_text),
            'special_char_ratio': self._special_char_ratio(full_text),
            
            # Header features
            'user_agent_length': len(headers.get('user-agent', '')),
            'has_user_agent': 1 if headers.get('user-agent') else 0,
            'suspicious_user_agent': self._is_suspicious_user_agent(headers.get('user-agent', '')),
            
            # IP reputation
            'ip_reputation': ip_reputation,
            
            # Geo features (if available)
            'geo_risk': self._geo_risk(geo_country),
        }
        
        return features
    
    def _count_url_encoded(self, text: str) -> int:
        """Count URL encoded characters (%XX)"""
        return len(re.findall(r'%[0-9A-Fa-f]{2}', text))
    
    def _count_hex_encoded(self, text: str) -> int:
        """Count hex encoded characters (0xXX)"""
        return len(re.findall(r'0x[0-9A-Fa-f]+', text))
    
    def _count_unicode(self, text: str) -> int:
        """Count unicode escape sequences"""
        return len(re.findall(r'\\u[0-9A-Fa-f]{4}', text))
    
    def _non_ascii_ratio(self, text: str) -> float:
        """Ratio of non-ASCII characters"""
        if not text:
            return 0.0
        non_ascii = sum(1 for c in text if ord(c) > 127)
        return non_ascii / len(text)
    
    def _calculate_entropy(self, text: str) -> float:
        """Calculate Shannon entropy"""
        if not text:
            return 0.0
        
        # Count character frequencies
        counter = Counter(text)
        length = len(text)
        
        # Calculate entropy
        entropy = 0.0
        for count in counter.values():
            probability = count / length
            entropy -= probability * math.log2(probability)
        
        return entropy
    
    def _count_sql_keywords(self, text: str) -> int:
        """Count SQL keywords in text"""
        count = 0
        for keyword in self.SQL_KEYWORDS:
            count += text.count(keyword)
        return count
    
    def _sql_keyword_density(self, text: str) -> float:
        """SQL keyword density"""
        if not text:
            return 0.0
        return self._count_sql_keywords(text) / len(text.split())
    
    def _count_xss_patterns(self, text: str) -> int:
        """Count XSS patterns"""
        count = 0
        for pattern in self.XSS_PATTERNS:
            count += len(re.findall(pattern, text, re.IGNORECASE))
        return count
    
    def _has_event_handler(self, text: str) -> int:
        """Check for JavaScript event handlers"""
        event_handlers = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus']
        return 1 if any(handler in text for handler in event_handlers) else 0
    
    def _count_path_traversal(self, text: str) -> int:
        """Count path traversal patterns"""
        count = 0
        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            count += text.count(pattern.lower())
        return count
    
    def _count_special_chars(self, text: str) -> int:
        """Count special characters"""
        special = r'[<>\'\";&|$`\\]'
        return len(re.findall(special, text))
    
    def _special_char_ratio(self, text: str) -> float:
        """Ratio of special characters"""
        if not text:
            return 0.0
        return self._count_special_chars(text) / len(text)
    
    def _is_suspicious_user_agent(self, user_agent: str) -> int:
        """Check if user agent is suspicious"""
        suspicious_patterns = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'burp', 'zap',
            'python-requests', 'curl', 'wget', 'bot', 'crawler', 'spider'
        ]
        ua_lower = user_agent.lower()
        return 1 if any(pattern in ua_lower for pattern in suspicious_patterns) else 0
    
    def _geo_risk(self, country_code: str) -> float:
        """
        Assign risk score based on geography
        This is a simplified example - in production, use real threat intelligence
        """
        high_risk_countries = ['XX', 'CN', 'RU', 'KP']  # XX = unknown
        if country_code in high_risk_countries:
            return 0.7
        return 0.3
    
    def detect_attack_type(self, uri: str, query_string: str, body: str) -> str:
        """
        Detect most likely attack type based on patterns
        """
        full_text = f"{uri} {query_string} {body}".lower()
        
        # Count each attack type score
        scores = {
            'SQL_INJECTION': 0,
            'XSS': 0,
            'PATH_TRAVERSAL': 0,
            'SSRF': 0,
            'UNKNOWN': 0
        }
        
        # SQL Injection
        if any(kw in full_text for kw in ['union', 'select', 'insert', '--', 'xp_']):
            scores['SQL_INJECTION'] += 3
        if "'" in full_text or '"' in full_text:
            scores['SQL_INJECTION'] += 1
        
        # XSS
        if '<script' in full_text or 'javascript:' in full_text:
            scores['XSS'] += 3
        if any(handler in full_text for handler in ['onerror', 'onload', 'onclick']):
            scores['XSS'] += 2
        if 'alert(' in full_text:
            scores['XSS'] += 2
        
        # Path Traversal
        if '..' in full_text:
            scores['PATH_TRAVERSAL'] += 3
        if '/etc/passwd' in full_text or 'c:\\windows' in full_text:
            scores['PATH_TRAVERSAL'] += 3
        
        # SSRF
        if any(proto in full_text for proto in ['file://', 'gopher://', 'dict://']):
            scores['SSRF'] += 3
        if 'localhost' in full_text or '127.0.0.1' in full_text:
            scores['SSRF'] += 1
        
        # Return attack type with highest score
        max_score = max(scores.values())
        if max_score == 0:
            return None
        
        for attack_type, score in scores.items():
            if score == max_score and attack_type != 'UNKNOWN':
                return attack_type
        
        return None
    
    def explain_risk(self, features: Dict[str, Any], risk_score: float) -> Dict[str, str]:
        """Generate human-readable risk factors"""
        risk_factors = {}
        
        if features['sql_keyword_count'] > 2:
            risk_factors['sql_keywords'] = f"Detected {features['sql_keyword_count']} SQL keywords"
        
        if features['xss_pattern_count'] > 0:
            risk_factors['xss_patterns'] = f"Detected {features['xss_pattern_count']} XSS patterns"
        
        if features['path_traversal_count'] > 0:
            risk_factors['path_traversal'] = "Path traversal attempt detected"
        
        if features['entropy'] > 5.0:
            risk_factors['high_entropy'] = f"Unusually high randomness (entropy: {features['entropy']:.2f})"
        
        if features['url_encoded_chars'] > 10:
            risk_factors['encoding'] = f"Excessive URL encoding ({features['url_encoded_chars']} chars)"
        
        if features['ip_reputation'] < 0.3:
            risk_factors['ip_reputation'] = "Low IP reputation score"
        
        if features['suspicious_user_agent']:
            risk_factors['user_agent'] = "Suspicious user agent detected"
        
        return risk_factors
