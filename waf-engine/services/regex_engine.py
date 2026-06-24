import re
from typing import Dict, Any, List
import urllib.parse

class RegexEngine:
    """
    OWASP Core Rule Set (CRS) compatible Regular Expression Engine.
    Provides a deterministic fallback and primary filter before AI evaluation.
    """
    def __init__(self):
        # Compiled OWASP Top 10 Signatures
        self.signatures = {
            "SQL_INJECTION": [
                re.compile(r"(?i)(?:'|%27|\\')\s*(?:OR|AND|\|\||&&)\s*(?:\d+=\d+|'[a-z]+'='[a-z]+')", re.IGNORECASE),
                re.compile(r"(?i)(?:UNION\s+ALL\s+SELECT|UNION\s+SELECT)", re.IGNORECASE),
                re.compile(r"(?i)(?:SELECT\s+.*\s+FROM\s+.*|INSERT\s+INTO\s+.*|UPDATE\s+.*\s+SET|DELETE\s+FROM\s+.*)", re.IGNORECASE),
                re.compile(r"(?i)(?:DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE)", re.IGNORECASE),
                re.compile(r"(?i)(?:EXEC\s*\(\s*@|EXECUTE\s*immediate|sp_executesql)", re.IGNORECASE),
                re.compile(r"(?i)(?:WAITFOR\s+DELAY|pg_sleep|sleep\s*\()", re.IGNORECASE),
                re.compile(r"(?i)(?:benchmark\s*\(|dbms_pipe\.receive_message)", re.IGNORECASE)
            ],
            "XSS": [
                re.compile(r"(?i)<script[^>]*>.*?</script>", re.IGNORECASE),
                re.compile(r"(?i)(?:on[a-z]+)\s*=\s*(?:'|\"|)[^>]*", re.IGNORECASE), # Event handlers like onload=, onerror=
                re.compile(r"(?i)javascript:[a-z0-9_]+\s*\(", re.IGNORECASE),
                re.compile(r"(?i)<img[^>]+src[^>]+onerror", re.IGNORECASE),
                re.compile(r"(?i)<svg[^>]+onload", re.IGNORECASE),
                re.compile(r"(?i)(?:document\.cookie|document\.write|window\.location)", re.IGNORECASE)
            ],
            "PATH_TRAVERSAL": [
                re.compile(r"(?i)(?:\.\./|\.\.\\|%2e%2e%2f|%2e%2e%5c|%2e%2e/|%2e%2e\\)", re.IGNORECASE),
                re.compile(r"(?i)(?:/etc/passwd|/windows/win\.ini|/boot\.ini|/etc/shadow)", re.IGNORECASE)
            ],
            "COMMAND_INJECTION": [
                re.compile(r"(?i)(?:;|\|\||&&|`|\$|\n)\s*(?:cat|ls|pwd|whoami|id|uname|ping|netstat|nc|bash|sh|wget|curl|perl|python|ruby)\b", re.IGNORECASE),
                re.compile(r"(?i)(?:/bin/bash|/bin/sh|/cmd\.exe|/powershell\.exe)", re.IGNORECASE)
            ],
            "LFI_RFI": [
                re.compile(r"(?i)(?:file|dict|ftp|gopher|http|https|ldap|tftp)://", re.IGNORECASE),
                re.compile(r"(?i)(?:php://filter|php://input|data://|expect://)", re.IGNORECASE)
            ]
        }

    def analyze(self, method: str, uri: str, query_string: str, body: str, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Scan all request components against OWASP signatures.
        Returns a high risk score (1.0) and the attack type if a signature matches.
        """
        payloads = [
            uri,
            query_string,
            body
        ]
        
        # Include relevant headers in payload checking
        for k, v in headers.items():
            if k.lower() in ["user-agent", "referer", "cookie"]:
                payloads.append(v)

        matched_attacks = []
        
        for raw_payload in payloads:
            if not raw_payload:
                continue
            
            # Decode URL-encoded characters (e.g. %20 -> space)
            payload = urllib.parse.unquote(raw_payload)
            
            for attack_type, regex_list in self.signatures.items():
                for regex in regex_list:
                    if regex.search(payload):
                        if attack_type not in matched_attacks:
                            matched_attacks.append(attack_type)

        if matched_attacks:
            return {
                "matched": True,
                "risk_score": 1.0,  # Deterministic block
                "reason": f"OWASP CRS Signature Match: {', '.join(matched_attacks)}",
                "attack_type": matched_attacks[0]
            }
            
        return {
            "matched": False,
            "risk_score": 0.0,
            "reason": "No signature matched",
            "attack_type": None
        }
