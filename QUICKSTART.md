# 🚀 QUICK START GUIDE

## Step 1: Download GeoIP Database (REQUIRED)

**This is mandatory for the WAF to work!**

### Option A: Download from MaxMind (Recommended)
1. Visit: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
2. Create free account (30 seconds)
3. Download **GeoLite2-City** in **MMDB format**
4. Extract and place `GeoLite2-City.mmdb` in: `d:\REVOX_AI_WAF\geoip\`

### Option B: Direct Download (No Account)
1. Visit: https://github.com/P3TERX/GeoLite.mmdb
2. Download `GeoLite2-City.mmdb`
3. Place in: `d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb`

**Final structure should be:**
```
d:\REVOX_AI_WAF\
├── geoip\
│   └── GeoLite2-City.mmdb  ← File must be here!
├── start_waf.bat
└── ...
```

---

## Step 2: Start the WAF

**Double-click** `start_waf.bat` or run:
```cmd
cd d:\REVOX_AI_WAF
.\start_waf.bat
```

**What happens:**
- ✅ Checks Docker is running
- ✅ Verifies GeoIP database exists
- ✅ Starts 7 Docker containers
- ✅ Waits for services to be healthy
- ✅ Opens dashboard in browser automatically

**Expected output:**
```
===========================================
   AegisX WAF - One-Click Startup
===========================================
✓ Docker is running
✓ GeoIP database found
Starting services...
[+] Building... (30-60 seconds first time)
[+] Running 7/7
✓ dashboard Healthy
✓ waf-engine Healthy
✓ ai-service Healthy
===========================================
   AegisX WAF Started Successfully!
===========================================
Dashboard: http://localhost:3000
Simulator: http://localhost:8080
===========================================
```

---

## Step 3: Access the Dashboard

**Browser will auto-open to:** http://localhost:3000

**You should see:**
- 🎨 Dark theme dashboard
- 📊 Stats bar (0 requests initially)
- 🗺️ Global attack map with world map
- 📋 Empty tables (waiting for traffic)
- ✅ **Green "Live Feed" indicator** (means WebSocket connected)

---

## Step 4: Generate Test Attacks

**Open simulator:** http://localhost:8080

**Click attack buttons:**
1. **💉 SQL Injection** - Test database attack detection
2. **🔥 XSS Attack** - Test cross-site scripting detection
3. **📁 Path Traversal** - Test file access detection
4. **🌊 Traffic Flood** - Test rate limiting

**Watch the dashboard update in real-time!**

---

## Step 5: Watch Real-Time Updates

### Dashboard Changes (within 1 second):

**Stats Bar:**
- Total Requests: Increases
- Blocked: Increases (for attacks)
- Live Feed: Stays green ✅

**Global Attack Map:**
- 🟠 Orange arc appears (attacker → Pune, India)
- Hover over marker to see IP details
- Animated arc = active attack

**Recent Events Table:**
- New row appears with:
  - Timestamp
  - Source IP (simulator's IP)
  - Method (GET/POST)
  - URI (attacked endpoint)
  - Risk score (80-100% for attacks)
  - **Red "BLOCK" badge**

**Top Attacking IPs:**
- Simulator IP appears
- Request count increases
- "Propose Block" button available

**Inspector Panel (click any event row):**
- Full event details
- **Payload with syntax highlighting** (SQL keywords in red)
- Risk score visualization
- IP reputation card
- Model confidence chart

---

## 🎯 Complete Test Flow

### Test SQL Injection:
1. Simulator: Click **"💉 SQL Injection"**
2. Dashboard: See arc on map
3. Dashboard: New row in events table
4. Dashboard: Click the row
5. Inspector: See payload highlighted:
   ```
   SELECT * FROM users WHERE username='admin'
   ```
   (`SELECT`, `FROM`, `WHERE` in red)

### Test XSS:
1. Simulator: Click **"🔥 XSS Attack"**
2. Dashboard: Orange arc appears
3. Inspector: See payload:
   ```
   <script>alert('XSS')</script>
   ```
   (`<script>`, `alert` in orange)

---

## ⚠️ Troubleshooting

### "GeoIP database not found"
- Download from links above
- Verify file path: `d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb`
- Filename must be **exactly** `GeoLite2-City.mmdb`

### Dashboard shows "Disconnected"
```cmd
# Check WAF engine logs
docker logs aegisx-waf-engine

# Restart services
.\stop_waf.bat
.\start_waf.bat
```

### No attacks showing
- Verify simulator is running: http://localhost:8080
- Check if attacks are being blocked in simulator UI
- Look for error messages in browser console (F12)

### Docker errors
```cmd
# Check Docker Desktop is running
docker ps

# Clean restart
.\stop_waf.bat
docker system prune -f  # Clean old containers
.\start_waf.bat
```

### Port already in use
If ports 80, 3000, 5000, 5001, or 8080 are busy:
```cmd
# Check what's using port
netstat -ano | findstr :3000

# Kill process or edit docker-compose.yml to use different ports
```

---

## 📊 Expected Performance

- **Dashboard load:** 2-3 seconds
- **Attack appears on map:** < 1 second
- **WebSocket latency:** 50-100ms
- **AI decision time:** < 100ms

---

## 🛑 Stopping the WAF

**Double-click** `stop_waf.bat` or run:
```cmd
.\stop_waf.bat
```

Gracefully shuts down all 7 containers.

---

## 📝 Viewing Logs

```cmd
# All services
docker-compose logs -f

# Specific service
docker logs aegisx-waf-engine -f
docker logs aegisx-ai -f
docker logs aegisx-dashboard -f
docker logs aegisx-nginx -f
```

---

## ✅ Success Criteria

You know it's working when:
- ✅ Dashboard loads with dark theme
- ✅ "Live Feed" indicator is green
- ✅ Clicking attacks in simulator creates arcs on map
- ✅ Events table populates
- ✅ Clicking event row shows details in inspector
- ✅ Payload has colored syntax highlighting
- ✅ Stats numbers increase

---

## 🎉 You're All Set!

Once you see real-time attacks on the map with animated arcs, your **production-grade AI-powered WAF** is fully operational!

**Next:** Test with real external IPs (deploy simulator to cloud) to see attacks from around the world!
