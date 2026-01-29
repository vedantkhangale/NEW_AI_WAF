# ✅ PRE-LAUNCH CHECKLIST

## Status: Almost Ready! 🚀

### ✅ Step 1: Docker (DONE)
- [x] Docker installed (v29.1.5)
- [x] Docker Desktop running
- [x] Docker containers: 0 (ready for startup)

### ⏳ Step 2: GeoIP Database (ACTION REQUIRED)

**You need to download ONE file before starting!**

#### Quick Download (2 minutes):

1. **Visit**: https://github.com/P3TERX/GeoLite.mmdb
2. **Download**: `GeoLite2-City.mmdb` (click the file, then "Download" button)
3. **Place here**: `d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb`

**Alternative** (requires account):
- https://dev.maxmind.com/geoip/geolite2-free-geolocation-data

**How to verify:**
- File should be ~70 MB
- Path should be: `d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb`

### ⏳ Step 3: Start the WAF (READY TO GO)

Once GeoIP is downloaded:

**Method 1: Double-click**
```
📂 d:\REVOX_AI_WAF\
   └─ start_waf.bat  ← Double-click this!
```

**Method 2: Command line**
```cmd
cd d:\REVOX_AI_WAF
.\start_waf.bat
```

**What it does:**
- ✓ Builds 7 Docker containers (1-2 min first time)
- ✓ Starts all services
- ✓ Opens dashboard automatically

---

## 🎯 After Starting

### Services Will Be Running At:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | Main SOC interface |
| **Simulator** | http://localhost:8080 | Attack testing tool |
| **WAF API** | http://localhost:5000/docs | Backend API (Swagger) |
| **Protected Site** | http://localhost | Test target |

### Expected Startup Time:
- **First Time**: 2-3 minutes (building images)
- **Subsequent**: 30-60 seconds (using cache)

---

## 🧪 Quick Test (5 seconds)

1. Open: **http://localhost:8080** (Simulator)
2. Click: **"💉 SQL Injection"**
3. Watch: **http://localhost:3000** (Dashboard)
4. See: Animated arc on map + new event in table! 🎉

---

## 📊 What You'll See

### Dashboard (http://localhost:3000):
```
┌─────────────────────────────────────────────────┐
│ AegisX WAF Dashboard                            │
├─────────────────────────────────────────────────┤
│ Stats Bar: [Total: 0] [Blocked: 0] [Live: 🟢] │
├─────────────────────────────────────────────────┤
│                                                 │
│          🗺️ GLOBAL ATTACK MAP                  │
│          (World map with Pune marker)          │
│                                                 │
├─────────────────────────────────────────────────┤
│ Top Attacking IPs: (Empty - waiting...)        │
├─────────────────────────────────────────────────┤
│ Recent Events: (Empty - waiting...)            │
└─────────────────────────────────────────────────┘
```

### After Attack:
```
┌─────────────────────────────────────────────────┐
│ Stats Bar: [Total: 1] [Blocked: 1] [Live: 🟢] │
├─────────────────────────────────────────────────┤
│          🗺️ GLOBAL ATTACK MAP                  │
│          ●───────────────→ ● Pune              │
│        Attacker       (Orange arc!)            │
├─────────────────────────────────────────────────┤
│ Top IPs: 172.x.x.x | 1 request | [Propose Block]│
├─────────────────────────────────────────────────┤
│ Events: 01:30:45 | SQL_INJECTION | 🔴 BLOCK    │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Common Issues

### "GeoIP database not found"
➡️ Download the file (Step 2 above)  
➡️ Verify path: `d:\REVOX_AI_WAF\geoip\GeoLite2-City.mmdb`

### Dashboard shows "Disconnected"
```cmd
# Restart services
.\stop_waf.bat
.\start_waf.bat
```

### Port 80 already in use
➡️ Another web server is running (IIS, Apache, etc.)  
➡️ Stop it or edit `docker-compose.yml` to use port 8080

---

## 📁 File Structure (Final Check)

```
d:\REVOX_AI_WAF\
├── 📄 start_waf.bat          ← Run this to start
├── 📄 stop_waf.bat           ← Run this to stop
├── 📄 QUICKSTART.md          ← Full instructions
├── 📄 docker-compose.yml
├── 📁 geoip/
│   └── 📄 GeoLite2-City.mmdb  ← MUST BE HERE!
├── 📁 waf-engine/
├── 📁 ai-service/
├── 📁 nginx/
├── 📁 dashboard/
└── 📁 simulator/
```

---

## 🎉 Ready to Launch!

**Summary:**
1. ✅ Docker is ready
2. ⏳ Download GeoIP → `geoip\GeoLite2-City.mmdb`
3. ✅ Run `start_waf.bat`
4. 🎯 Test with http://localhost:8080

**Estimated Time:** 5 minutes total  
**Your Next Action:** Download GeoLite2-City.mmdb

---

Need help? See **QUICKSTART.md** for full instructions!
