# GeoIP Database Placeholder

The WAF will work without the GeoIP database, but geographic locations will show as "Unknown".

To enable full geo-location features:

1. Download from: https://github.com/P3TERX/GeoLite.mmdb
2. Get the file: GeoLite2-City.mmdb
3. Place it here: d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb
4. Restart the WAF: .\stop_waf.bat then .\start_waf.bat

The system is fully functional without it for testing!
