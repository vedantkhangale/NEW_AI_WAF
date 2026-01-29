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
        if not self.reader:
            return self._mock_resolve(ip_address)
        
        # Skip this check so we can mock locations for private IPs too
        # if ip_address in ['127.0.0.1', 'localhost'] or ip_address.startswith('192.168.'): ...
        
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
            # If not found in DB (e.g. private IP that wasn't caught above), use mock data
            # This ensures the map looks good even with local Docker IPs
            logger.warning(f"IP {ip_address} not found in GeoIP DB, using mock data")
            return self._mock_resolve(ip_address)
        except Exception as e:
            logger.error(f"Error resolving IP {ip_address}: {e}")
            return self._default_response()
    
    def _mock_resolve(self, ip_address: str) -> Dict[str, Any]:
        """Mock resolution - Deterministic based on IP prefix"""
        # Prefixes for simulator to use
        # 10.1.x.x -> US
        # 10.2.x.x -> China
        # 10.3.x.x -> Russia
        # etc.
        
        mock_db = {
            "10.1.": {"code": "US", "name": "United States", "city": "San Francisco", "lat": 37.77, "lon": -122.41},
            "10.2.": {"code": "CN", "name": "China", "city": "Shanghai", "lat": 31.23, "lon": 121.47},
            "10.3.": {"code": "RU", "name": "Russia", "city": "Moscow", "lat": 55.75, "lon": 37.61},
            "10.4.": {"code": "BR", "name": "Brazil", "city": "Sao Paulo", "lat": -23.55, "lon": -46.63},
            "10.5.": {"code": "DE", "name": "Germany", "city": "Berlin", "lat": 52.52, "lon": 13.40},
            "10.6.": {"code": "IN", "name": "India", "city": "Mumbai", "lat": 19.07, "lon": 72.87},
            "10.7.": {"code": "JP", "name": "Japan", "city": "Tokyo", "lat": 35.67, "lon": 139.65},
            "10.8.": {"code": "AU", "name": "Australia", "city": "Sydney", "lat": -33.86, "lon": 151.20},
            "10.9.": {"code": "FR", "name": "France", "city": "Paris", "lat": 48.85, "lon": 2.35},
            "10.10.": {"code": "GB", "name": "United Kingdom", "city": "London", "lat": 51.50, "lon": -0.12},
        }

        # Check prefixes
        for prefix, data in mock_db.items():
            if ip_address.startswith(prefix):
                 return {
                    'country_code': data['code'],
                    'country_name': data['name'],
                    'city': data['city'],
                    'latitude': data['lat'],
                    'longitude': data['lon'],
                    'is_private': False
                }

        # Fallback to hash for other IPs
        cities = list(mock_db.values())
        try:
            octets = [int(p) for p in ip_address.split('.') if p.isdigit()]
            val = sum(octets)
        except:
            val = len(ip_address)
            
        city = cities[val % len(cities)]
        
        return {
            'country_code': city['code'],
            'country_name': city['name'],
            'city': city['city'],
            'latitude': city['lat'],
            'longitude': city['lon'],
            'is_private': False
        }
    
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
