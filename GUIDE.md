# AegisX WAF - Complete Setup Guide
**From Zero to Fully Operational WAF System**

This guide will take you from a fresh Windows PC to a running production-grade Web Application Firewall with real-time dashboard and attack simulation capabilities.

---

## 📋 Prerequisites

Before starting, ensure you have:

### Required Software
1. **Windows 10/11** (64-bit)
2. **Docker Desktop** (Latest version)
   - Download: https://www.docker.com/products/docker-desktop
   - Enable WSL 2 backend during installation
3. **Git** (Optional, for cloning)
   - Download: https://git-scm.com/downloads
4. **Modern Web Browser** (Chrome, Edge, or Firefox)

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free disk space
- **CPU**: Dual-core or better

---

## 🚀 Installation Steps

### Step 1: Install Docker Desktop

1. Download Docker Desktop from the official website
2. Run the installer and follow the setup wizard
3. **Important**: Enable WSL 2 when prompted
4. Restart your computer when installation completes
5. Launch Docker Desktop and wait for it to fully start
6. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

### Step 2: Obtain the AegisX WAF

**Option A: Clone with Git**
```powershell
cd D:\
git clone <repository-url> REVOX_AI_WAF
cd REVOX_AI_WAF
```

**Option B: Extract from ZIP**
1. Extract the provided ZIP file to `D:\REVOX_AI_WAF`
2. Open PowerShell and navigate:
   ```powershell
   cd D:\REVOX_AI_WAF
   ```

### Step 3: Verify Directory Structure

Ensure the following directories exist:
```
REVOX_AI_WAF/
├── waf-engine/         # Core WAF backend
├── dashboard/          # React dashboard (SOC)
├── simulator/          # Attack simulator
├── nginx/              # OpenResty proxy
├── ai-service/         # AI decision engine
├── geoip/              # GeoIP database (optional)
├── docker-compose.yml
├── start_waf.bat       # One-click starter
└── stop_waf.bat        # One-click stopper
```

### Step 4: First-Time System Initialization

The first startup will take 5-10 minutes as Docker downloads and builds all images.

**Launch the WAF:**
```powershell
.\start_waf.bat
```

This script will:
- ✅ Pull required Docker base images
- ✅ Build all microservices
- ✅ Initialize PostgreSQL database
- ✅ Start Redis cache
- ✅ Launch AI service
- ✅ Start WAF engine
- ✅ Launch OpenResty proxy
- ✅ Start React dashboard
- ✅ Launch attack simulator
- ✅ Open your browser to `http://localhost:3000`

**Expected Output:**
```
[*] Starting AegisX WAF System...
[*] Building images (first run may take 5-10 minutes)...
[+] Running 7/7
 ✔ Container aegisx-postgres      Started
 ✔ Container aegisx-redis          Started
 ✔ Container aegisx-ai             Started
 ✔ Container aegisx-waf-engine     Started
 ✔ Container aegisx-nginx          Started
 ✔ Container aegisx-dashboard      Started
 ✔ Container aegisx-simulator      Started
[*] AegisX WAF is now running!
```

### Step 5: Verify All Services

**Check service health:**
```powershell
docker ps
```

You should see 7 running containers:

| Container Name         | Port        | Status  |
|------------------------|-------------|---------|
| aegisx-dashboard       | 3000        | Up      |
| aegisx-waf-engine      | 5000        | Up      |
| aegisx-nginx           | 80, 443     | Up      |
| aegisx-simulator       | 8080        | Up      |
| aegisx-ai              | 5001        | Up      |
| aegisx-postgres        | 5432        | Up      |
| aegisx-redis           | 6379        | Up      |

**Test individual endpoints:**
```powershell
# Dashboard (should open in browser automatically)
Start-Process "http://localhost:3000"

# WAF Engine Health
curl.exe http://localhost:5000/health

# Simulator UI
Start-Process "http://localhost:8080"
```

---

## 🎯 Using the System

### Accessing the Dashboard (SOC)
1. Open your browser to `http://localhost:3000`
2. You'll see the **AegisX Security Operations Center**
3. Key features:
   - **Overview Tab**: Real-time attack map, statistics
   - **Analytics Tab**: Charts, trends, manual IP blocking
   - **Events Log Tab**: All requests with Wireshark-style inspection
   - **Settings Tab**: Configuration options

### Running Attack Simulations

**Using the Web Simulator:**
1. Open `http://localhost:8080`
2. Select an attack type (SQL Injection, XSS, etc.)
3. Choose a source country (for GeoIP spoofing)
4. *Optional*: Enter a custom source IP to override country selection
5. Click **"Launch Single Attack"** or **"Launch Batch (10x)"**
6. Watch the results appear in real-time on the dashboard at `http://localhost:3000`

**Attack Types Available:**
- 💉 **SQL Injection** - Database attack patterns
- 🔥 **XSS Attack** - Cross-site scripting
- 📂 **Path Traversal** - Directory traversal attempts
- 🌐 **SSRF** - Server-side request forgery
- ✅ **Legitimate Traffic** - Normal requests (baseline)
- 🌊 **Traffic Flood** - High-volume stress test

### Using the Kali Linux Simulator (Advanced)

For distributed attack simulation from a separate machine:

1. Copy `simulator/kali_sim.py` and `simulator/templates/` to your Kali Linux machine
2. Install dependencies:
   ```bash
   pip3 install flask requests
   ```
3. Run the simulator:
   ```bash
   python3 kali_sim.py --target http://<WINDOWS_PC_IP>:80
   ```
4. Access the UI: `http://<KALI_IP>:5555`

---

## 🛠️ Configuration

### Environment Variables

Key configurations are in `docker-compose.yml`:

**WAF Engine:**
```yaml
environment:
  - DATABASE_URL=postgresql://waf_user:waf_secure_pass_2026@postgres:5432/aegisx_waf
  - REDIS_HOST=redis
  - REDIS_PASSWORD=redis_secure_2026
  - AI_SERVICE_URL=http://ai-service:5001
  - SERVER_LAT=18.5204    # Your server location (for map)
  - SERVER_LON=73.8567
```

**Simulator:**
```yaml
environment:
  - TARGET_URL=http://nginx-proxy:80
```

### Customizing Attack Payloads

Edit `simulator/host_sim.py` to add custom attack patterns:
```python
ATTACK_CATALOG = {
    "sql_injection": {
        "payloads": [
            "' OR '1'='1",
            "custom_payload_here"
        ]
    }
}
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Docker Desktop not running**
```
Error: Cannot connect to the Docker daemon
```
**Solution:** Launch Docker Desktop and wait for it to fully start (green icon in system tray)

**2. Port conflicts**
```
Error: port is already allocated
```
**Solution:** Stop services using conflicting ports:
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

**3. Containers failing to start**
```powershell
# View logs for a specific service
docker logs aegisx-waf-engine

# Restart all services
.\stop_waf.bat
.\start_waf.bat
```

**4. Dashboard shows "Connection Failed"**
- Wait 30 seconds for all services to initialize
- Check WAF engine health: `curl.exe http://localhost:5000/health`
- Restart if needed: `docker-compose restart waf-engine dashboard`

**5. Simulator attacks not appearing on dashboard**
- Verify the simulator is targeting the correct URL (`http://localhost:80`)
- Check simulator logs: `docker logs aegisx-simulator`
- Ensure the attack payload starts with `/` (e.g., `/admin`)

### Viewing Logs

**All services:**
```powershell
docker-compose logs -f
```

**Specific service:**
```powershell
docker logs -f aegisx-waf-engine
docker logs -f aegisx-dashboard
docker logs -f aegisx-simulator
```

### Rebuilding Services

If you modify code, rebuild the specific service:
```powershell
docker-compose up -d --build simulator
docker-compose up -d --build waf-engine
```

---

## 🛑 Stopping the System

**Clean shutdown:**
```powershell
.\stop_waf.bat
```

This will:
- Stop all containers gracefully
- Preserve database and logs
- Keep Docker images cached for faster restart

**Complete cleanup (removes all data):**
```powershell
docker-compose down -v
```
⚠️ **Warning:** This deletes the database, logs, and all cached data!

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                        │
│  Dashboard / SOC Interface                              │
└────────────────┬────────────────────────────────────────┘
                 │ WebSocket + REST
                 ▼
┌─────────────────────────────────────────────────────────┐
│  WAF Engine (FastAPI)         Port 5000                 │
│  - Decision Engine                                      │
│  - GeoIP Resolution                                     │
│  - WebSocket Server                                     │
└────┬──────────────────────┬──────────────┬──────────────┘
     │                      │              │
     ▼                      ▼              ▼
┌──────────┐      ┌──────────────┐   ┌─────────────┐
│PostgreSQL│      │   Redis      │   │ AI Service  │
│  (DB)    │      │  (Cache)     │   │ (LightGBM)  │
│Port 5432 │      │  Port 6379   │   │ Port 5001   │
└──────────┘      └──────────────┘   └─────────────┘
     ▲
     │ Logs & Analysis
     │
┌────┴──────────────────────────────────────────────────┐
│  OpenResty (Nginx + Lua)        Port 80/443           │
│  - WAF Interceptor                                    │
│  - Rate Limiting                                      │
│  - Request Forwarding                                 │
└────▲──────────────────────────────────────────────────┘
     │
     │ Simulated Attacks
     │
┌────┴──────────────────────────────────────────────────┐
│  Attack Simulator              Port 8080              │
│  - Web UI                                             │
│  - Country-based IP Spoofing                          │
│  - Multiple attack vectors                            │
└───────────────────────────────────────────────────────┘
```

---

## 🎓 Next Steps

After successful setup:

1. **Experiment with different attack types** to see how the AI responds
2. **Review blocked requests** in the Events Log tab
3. **Use Manual IP Blocking** in the Analytics tab
4. **Monitor the Global Attack Map** for real-time visualization
5. **Inspect individual requests** using the Wireshark-style inspector
6. **Train the AI** by providing feedback on decisions (PENDING requests)

---

## 📚 Additional Resources

- **User Guide**: See `USER_GUIDE.md` for detailed feature documentation
- **Architecture**: See `ARCHITECTURE.md` for technical deep-dive
- **Kali Setup**: See `simulator/README_KALI.md` for distributed testing
- **API Documentation**: Visit `http://localhost:5000/docs` (FastAPI Swagger)

---

## 🆘 Getting Help

**Check logs first:**
```powershell
# View all service logs
docker-compose logs

# View specific service
docker logs aegisx-waf-engine --tail 100
```

**Restart everything:**
```powershell
.\stop_waf.bat
.\start_waf.bat
```

**Full reset (last resort):**
```powershell
docker-compose down -v
docker system prune -a
.\start_waf.bat
```

---

**🛡️ AegisX WAF - Production-Grade AI-Powered Web Application Firewall**

*Protect. Detect. Analyze.*
