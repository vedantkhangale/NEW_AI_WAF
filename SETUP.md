# AegisX WAF - Setup Instructions

## Quick Setup Guide

### Step 1: Download GeoIP Database

**IMPORTANT**: The WAF requires the MaxMind GeoLite2 City database for IP geolocation.

1. Visit: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
2. Create a free account
3. Download `GeoLite2-City.mmdb`
4. Create folder: `geoip/` in the project root
5. Place the `.mmdb` file in the `geoip/` folder

**File structure should be:**
```
REVOX_AI_WAF/
├── geoip/
│   └── GeoLite2-City.mmdb  ← Place here
├── start_waf.bat
├── stop_waf.bat
└── ...
```

### Step 2: Start the WAF

Double-click `start_waf.bat` or run:
```cmd
.\start_waf.bat
```

**The script will:**
- Check Docker is running
- Verify GeoIP database exists
- Build and start all services
- Open the dashboard automatically

### Step 3: Access Services

- **Dashboard**: http://localhost:3000 (Real-time SOC interface)
- **Simulator**: http://localhost:8080 (Attack testing tool)
- **WAF API**: http://localhost:5000/api (Backend API)
- **Protected Site**: http://localhost (Test target)

### Step 4: Test the WAF

1. Open the Simulator at http://localhost:8080
2. Click attack buttons to test different threats:
   - 💉 SQL Injection
   - 🔥 XSS Attack  
   - 📁 Path Traversal
   - 🌐 SSRF
   - ✅ Legitimate Traffic
   - 🌊 Traffic Flood

3. Watch results in:
   - Simulator UI (immediate feedback)
   - Dashboard at http://localhost:3000 (real-time map & analytics)

### Step 5: Stop the WAF

Double-click `stop_waf.bat` or run:
```cmd
.\stop_waf.bat
```

---

## Troubleshooting

### "Docker not running" Error
1. Start Docker Desktop
2. Wait for it to fully initialize
3. Run `start_waf.bat` again

### "GeoIP database not found" Error
1. Download `GeoLite2-City.mmdb` (see Step 1 above)
2. Place in the `geoip/` folder
3. Run `start_waf.bat` again

### Services Not Starting
```cmd
# Check Docker logs
docker-compose logs

# For specific service
docker logs aegisx-waf-engine
docker logs aegisx-ai
docker logs aegisx-nginx
```

### Port Already in Use
If ports 80, 3000, 5000, 5001, or 8080 are in use:
1. Stop conflicting services
2. Or edit `docker-compose.yml` to use different ports

---

## Configuration

Edit `.env` file to customize:

```env
# Your server location (for map visualization)  
SERVER_LAT=18.5204  # Pune, India
SERVER_LON=73.8567

# AI Decision Thresholds
AI_THRESHOLD_LOW=0.3   # Below: auto-allow
AI_THRESHOLD_HIGH=0.7  # Above: auto-block

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

---

## Real-World IP Testing

**IMPORTANT**: To see real IPs on the map (not just localhost):

### Option 1: Deploy Simulator on Cloud
1. Deploy `simulator/` to AWS/GCP/DigitalOcean
2. Update simulator to target your WAF's public IP
3. Attacks will come from real public IPs

### Option 2: Use ngrok/Cloudflare Tunnel
1. Install ngrok: https://ngrok.com/
2. Expose your WAF:
   ```cmd
   ngrok http 80
   ```
3. Share the ngrok URL with friends
4. Their requests will show real IPs from different locations

### Option 3: Use VPN
1. Connect to VPN in different country
2. Test from VPN IP
3. Will show on map with VPN country

---

## Dashboard Features

### 1. Live Attack Map
- Real-time visualization of incoming requests
- Animated arrows from source → destination
- Color-coded by threat level:
  - 🔴 Red: High risk (blocked)
  - 🟡 Yellow: Medium risk (pending)
  - 🟢 Green: Low risk (allowed)

### 2. Analytics Table
- Wireshark-style request inspector
- Columns: Time, IP, Country, Method, URI, Risk Score, Action
- Real-time updates via WebSocket
- Search and filter capabilities

### 3. Review Queue
- Requests pending human decision
- Score between 0.3-0.7  
- Human clicks "Allow" or "Block"
- Feedback used to retrain AI

### 4. Statistics
- Total requests today
- Blocked vs allowed ratio
- Top attacking IPs
- Attack type breakdown

---

## AI Learning Pipeline

1. **Initial Model**: Trained on synthetic data (SQL, XSS, Path Traversal, Benign)
2. **Human Feedback**: Review borderline cases in dashboard
3. **Retraining**: Manually trigger via API:
   ```bash
   curl -X POST http://localhost:5000/api/retrain
   ```
4. **Model Update**: New model deployed automatically

---

## Performance Metrics

Expected performance on modern hardware:

- **AI Inference**: < 50ms per request
- **Total Latency Overhead**: < 100ms
- **Throughput**: 1000+ requests/second
- **Memory Usage**: ~2GB total (all services)
- **Disk Usage**: ~5GB (with logs)

---

## Security Notes

⚠️ **Important**: This is a demonstration/academic project.

**Before production use:**
1. Conduct full security audit
2. Change all default passwords in `.env`
3. Enable HTTPS/TLS
4. Implement proper authentication
5. Set up log rotation
6. Configure backups
7. Harden database permissions
8. Review and test fail-open/fail-closed strategy

---

## Support

- Check logs: `docker-compose logs [service-name]`
- View task list: See `task.md` artifact
- Implementation details: See `implementation_plan.md` artifact

---

**Built for Final Year Computer Engineering Project - 2026**
