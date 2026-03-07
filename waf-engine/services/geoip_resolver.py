"""
GeoIP resolver using MaxMind GeoLite2 database
"""

import geoip2.database
import geoip2.errors
from typing import Dict, Any, Optional
from loguru import logger


class GeoIPResolver:
    """GeoIP resolution service"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.reader: Optional[geoip2.database.Reader] = None
    
    def load_database(self):
        """Load GeoIP database"""
        try:
            self.reader = geoip2.database.Reader(self.db_path)
            logger.info(f"GeoIP database loaded from {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to load GeoIP database: {e}")
            self.reader = None
    
    def is_loaded(self) -> bool:
        """Check if database is loaded"""
        return self.reader is not None
    
    
    def resolve(self, ip_address: str) -> Dict[str, Any]:
        """
        Resolve IP address to geographic location
        Returns dict with: country_code, city, latitude, longitude
        """
        # Default mock logic or fallback
        if ip_address in ['127.0.0.1', 'localhost'] or ip_address.startswith('192.168.') or ip_address.startswith('172.') or ip_address.startswith('10.'):
             response = self._default_response()
             response['is_private'] = True
             return response

        # Try local DB first
        if self.reader:
            try:
                response = self.reader.city(ip_address)
                return {
                    'country_code': response.country.iso_code or 'XX',
                    'country_name': response.country.name or 'Unknown',
                    'city': response.city.name or 'Unknown',
                    'latitude': response.location.latitude or 0.0,
                    'longitude': response.location.longitude or 0.0,
                    'is_private': False
                }
            except (geoip2.errors.AddressNotFoundError, ValueError):
                pass # Not found
            except Exception as e:
                logger.error(f"Error resolving IP {ip_address} locally: {e}")

        # Fallback to default response if DB missing or IP not found
        return self._default_response()
    
    def _default_response(self) -> Dict[str, Any]:
        """Default response when resolution fails"""
        return {
            'country_code': 'XX',
            'country_name': 'Unknown',
            'city': 'Unknown',
            'latitude': 0.0,
            'longitude': 0.0,
            'is_private': False
        }
    
    def close(self):
        """Close database reader"""
        if self.reader:
            self.reader.close()
            logger.info("GeoIP database closed")
