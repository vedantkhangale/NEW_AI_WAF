# AegisX WAF - Global Attack Simulator Setup

## 🌍 2-Node Distributed Architecture

### Architecture Overview
```
┌─────────────────────────────────────────────┐
│  Node A: WAF Host (192.168.1.x)            │
│  ┌─────────────┐  ┌──────────────┐         │
│  │   Nginx     │→ │  WAF Engine  │         │
│  │  (Port 80)  │  │   (Port 5000)│         │
│  └─────────────┘  └──────────────┘         │
│         ↓                                   │
│  ┌─────────────┐  ┌──────────────┐         │
│  │  Dashboard  │  │   Backend    │         │
│  │ (Port 3000) │  │  (Port 8080) │         │
│  └─────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
                     ↑
                     │ Attacks with
                     │ X-Forwarded-For:
                     │ 202.106.0.20 (CN)
                     │ 109.207.13.5 (RU)
                     │ 8.8.8.8 (US)
                     │
┌─────────────────────────────────────────────┐
│  Node B: Simulator (192.168.1.y)           │
│  ┌──────────────────────────────┐          │
│  │  global_attack_sim.py        │          │
│  │  - 5 concurrent threads      │          │
│  │  - 7 country IP pools        │          │
│  │  - 6 attack types            │          │
│  └──────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

## 🔧 Setup Instructions

### Step 1: Configure WAF Host (Node A)

1. **Find your LAN IP**:
   ```powershell
   # Windows
   ipconfig
   
   # Look for "IPv4 Address" under your active network adapter
   # Example: 192.168.1.10
   ```

2. **Verify Docker is exposing port 80**:
   - Already configured in `docker-compose.yml`:
   ```yaml
   nginx-proxy:
     ports:
       - "80:80"  # ✓ Exposed to all interfaces
   ```

3. **Restart WAF with new config**:
   ```powershell
   cd d:\REVOX_AI_WAF
   docker-compose down
   docker-compose up -d --build nginx-proxy
   ```

4. **Verify WAF is accessible**:
   ```powershell
   curl http://localhost
   # Should see backend response or WAF block page
   ```

### Step 2: Configure Simulator (Node B)

Node B can be:
- A Guest VM (VirtualBox, VMware, Hyper-V)
- A second laptop on same WiFi
- Same machine (for testing)

1. **Test network connectivity**:
   ```powershell
   # From Node B, ping the WAF host
   ping 192.168.1.10  # Replace with your WAF IP
   ```

2. **Update simulator target**:
   - Edit `simulator/global_attack_sim.py`
   - Line 26: `TARGET_URL = "http://192.168.1.10"`  # Your WAF IP

3. **Install requirements**:
   ```powershell
   cd simulator
   pip install requests
   ```

### Step 3: Run the Demo

1. **Start WAF** (Node A):
   ```powershell
   cd d:\REVOX_AI_WAF
   .\start_waf.bat
   ```

2. **Open Dashboard** (Node A):
   - Browser: `http://localhost:3000`
   - Navigate to Overview tab
   - Watch the Global Attack Map

3. **Launch Simulator** (Node B):
   ```powershell
   cd simulator
   python global_attack_sim.py
   ```

## 🎬 Expected Results

### Terminal Output (Simulator)
```
[02:30:15] [001] 🇨🇳 China (202.106.0.20   ) → SQL Injection         → /?id=1' OR '1'='1                    ✗ BLOCKED
[02:30:17] [002] 🇷🇺 Russia (109.207.13.5   ) → XSS Attack           → /?name=<script>alert('XSS')</script> ✗ BLOCKED
[02:30:19] [003] 🇺🇸 United States (8.8.8.8 ) → Legitimate           → /about                                ✓ ALLOWED
[02:30:21] [004] 🇧🇷 Brazil (189.6.0.1      ) → Path Traversal       → /../../../etc/passwd                 ✗ BLOCKED
```

### Dashboard (Browser)
- **Global Attack Map**: Animated arrows from Beijing, Moscow, San Francisco, São Paulo
- **Top Attacking IPs**: Shows spoofed IPs (202.106.0.20, 109.207.13.5, etc.)
- **Recent Events**: Real-time attack logs with correct countries
- **Stats**: Block rate, attack types, geographic distribution

## 🔒 Security Notes

### Current Configuration (DEMO MODE)
```nginx
# nginx.conf - Lines 76-79
if ($remote_addr ~* "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)") {
    set $real_client_ip $http_x_forwarded_for;
}
```

**This trusts X-Forwarded-For from local networks ONLY.**

### Production Deployment

**⚠️ NEVER deploy this config to production without modification!**

For production, change to trust only your CDN/Load Balancer:

```nginx
# PRODUCTION: Only trust CloudFlare IPs
set $real_client_ip $remote_addr;

# CloudFlare IP ranges (example)
if ($remote_addr ~* "^(103\.21\.|103\.22\.|103\.31\.|104\.16\.)") {
    set $real_client_ip $http_cf_connecting_ip;
}
```

Or use nginx's `real_ip` module:
```nginx
set_real_ip_from 103.21.244.0/22;  # CloudFlare
set_real_ip_from 103.22.200.0/22;
real_ip_header CF-Connecting-IP;
```

## 🎯 Customization

### Add More Countries

Edit `global_attack_sim.py`:

```python
COUNTRY_IPS = {
    "🇯🇵 Japan": ["126.0.0.1", "133.0.0.1"],
    "🇬🇧 UK": ["81.2.0.1", "82.12.0.1"],
    # ... add more
}
```

### Change Attack Patterns

```python
ATTACK_PATTERNS = {
    "Your Custom Attack": [
        "/your/path?param=malicious",
        "/another/endpoint",
    ]
}
```

### Adjust Concurrency

```python
NUM_THREADS = 10  # More concurrent attackers
ATTACK_INTERVAL = 1  # Faster attacks (seconds)
TOTAL_ATTACKS = 100  # More total attacks
```

## 🐛 Troubleshooting

### Map shows only local IP
- ✓ Nginx config updated with X-Forwarded-For trust?
- ✓ Nginx container restarted after config change?
- ✓ Simulator using correct WAF IP?

### No arrows on map
- ✓ GeoIP database installed in nginx container?
- ✓ WebSocket connection active? (Check browser console)
- ✓ Events being logged? (Check `/api/requests`)

### Simulator can't connect
- ✓ WAF host firewall allows port 80?
- ✓ Both machines on same network?
- ✓ Can ping WAF host from simulator?

### All attacks allowed
- ✓ WAF engine running? (`docker ps | findstr waf-engine`)
- ✓ Decision engine initialized? (`docker logs aegisx-waf-engine`)
- ✓ DNS resolver working in nginx? (See earlier fix)

## 📊 Demo Script

**Perfect for presentations:**

1. **Show empty map** (Dashboard loaded, no attacks)
2. **Start narration**: "This WAF protects against global threats..."
3. **Launch simulator**: `python global_attack_sim.py`
4. **Watch arrows appear**: "Here we see attacks from China, Russia, US..."
5. **Click on map markers**: "The WAF blocked this SQL injection from Beijing..."
6. **Show stats**: "94% of attacks blocked, 99.5% accuracy..."

Perfect for:
- University projects
- Security conferences
- Job interviews
- Client demonstrations
