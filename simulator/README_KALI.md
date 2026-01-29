# Running AegisX Attack Simulator from Kali Linux

## 🎯 Quick Start Guide

This guide shows you how to run the **Kali Linux attack simulator** against your AegisX WAF installation.

**Current Simulator**: `kali_sim.py`
**Target WAF**: Configure in the script (default: `http://localhost`)

---

## 📋 Step 1: Transfer the Script to Kali Linux

### Option A: Clone from GitHub (Recommended)
```bash
# Clone the repository
git clone https://github.com/vedantkhangale/NEW_AI_WAF.git
cd NEW_AI_WAF/simulator
```

### Option B: Direct Copy
If you have shared folders or can access Windows from Kali:

```bash
# From Kali Linux terminal
# If Windows drive is mounted (e.g., /mnt/d/)
cp /mnt/d/REVOX_AI_WAF/simulator/kali_sim.py ~/
```

### Option C: Manual Copy/Paste
1. On Windows: Open `kali_sim.py` in notepad
2. Select All (Ctrl+A), Copy (Ctrl+C)
3. On Kali: Create new file: `nano ~/kali_sim.py`
4. Paste (Ctrl+Shift+V)
5. Save (Ctrl+O, Enter, Ctrl+X)

---

## 📦 Step 2: Install Python Dependencies

```bash
# Update package list
sudo apt update

# Install pip if not installed
sudo apt install python3-pip -y

# Install required libraries
pip3 install flask requests
```

---

## 🔧 Step 3: Configure the Target WAF

Edit `kali_sim.py` to set your WAF target:

```bash
nano ~/kali_sim.py
```

Find and modify this line:
```python
WAF_TARGET = os.getenv('TARGET_URL', 'http://YOUR_WAF_IP_HERE')
```

Replace with your WAF's IP or hostname, for example:
```python
WAF_TARGET = os.getenv('TARGET_URL', 'http://192.168.1.100')
# Or if running on same machine:
WAF_TARGET = os.getenv('TARGET_URL', 'http://localhost')
```

---

## ✅ Step 4: Verify Network Connectivity

**CRITICAL**: Your Kali VM must be able to reach the WAF!

```bash
# Get your WAF IP (if running on Windows, run ipconfig on Windows)
# Then from Kali, test connectivity
ping YOUR_WAF_IP

# Expected output:
# 64 bytes from YOUR_WAF_IP: icmp_seq=1 ttl=128 time=1.23 ms
# ✓ If you see replies, you're good to go!

# If ping fails, check:
# 1. VM network adapter set to "Bridged" (not NAT)
# 2. Windows Firewall allows incoming on port 80
# 3. Docker containers are running on Windows (docker ps)
```

### Verify WAF is Accessible

```bash
# Quick HTTP test
curl http://YOUR_WAF_IP

# Expected: HTML response or WAF message
# If connection refused: WAF is not running or firewall blocking
```

---

## 🚀 Step 5: Run the Simulator

```bash
# Navigate to script location
cd ~/NEW_AI_WAF/simulator
# Or if you copied manually:
cd ~

# Run the simulator on port 5001 (Kali mode)
python3 kali_sim.py
```

The simulator will start on **http://0.0.0.0:5001**

---

## � Step 6: Access the Web Interface

### From Kali VM:
```bash
# Open browser in Kali
firefox http://localhost:5001
```

### From Windows Host:
Find your Kali VM's IP:
```bash
# On Kali, run:
ip addr show | grep inet
```

Then open browser on Windows:
```
http://KALI_VM_IP:5001
```

---

## 🎬 Using the Simulator Web Interface

Once opened, you'll see:

1. **Attack Selection Grid**: Click to select attack type
   - SQL Injection 💉
   - XSS Attack 🔥
   - Path Traversal 📂
   - SSRF 🌐
   - Legitimate Traffic ✅
   - Traffic Flood 🌊

2. **Configuration Panel**:
   - **Source Country**: Select attacker's origin country
   - **Custom IP**: Override with specific IP (optional)

3. **Launch Buttons**:
   - **🚀 Launch Single Attack**: Send one attack
   - **💥 Launch Batch (10x)**: Send 10 attacks rapidly

4. **Results Log**: Shows real-time results with:
   - Attack type
   - Source IP and country
   - **Payload used** (newly added!)
   - Status: BLOCKED 🛡️ or ALLOWED ⚠️

---

## 🔥 Available Attack Types

### 1. SQL Injection 💉
**Payloads**:
- `/?id=1' OR '1'='1`
- `/?id=1 UNION SELECT * FROM users`
- `/?value=1'; DROP TABLE users--`

### 2. XSS Attack 🔥
**Payloads**:
- `/?name=<script>alert('XSS')</script>`
- `/?q=<img src=x onerror=alert(1)>`
- `/?search=<svg onload=alert('XSS')>`

### 3. Path Traversal 📂
**Payloads**:
- `/../../../etc/passwd`
- `/../../windows/win.ini`
- `/?file=../../../etc/shadow`

### 4. SSRF 🌐
**Payloads**:
- `http://169.254.169.254/latest/meta-data/`
- `http://localhost:6379`
- `http://127.0.0.1:22`
- `gopher://127.0.0.1:25`

### 5. Legitimate Traffic ✅
**Payloads**:
- `/products?id=123`
- `/search?q=laptop`
- `/login`
- `/contact`

### 6. Traffic Flood 🌊
**Payloads**:
- Rapid legitimate requests
- `/api/data`, `/images/logo.png`
- `/large-file.zip`

---

## � Monitoring on Dashboard

While running attacks, monitor your **AegisX Dashboard** (http://localhost:3000):

- **🌍 Global Attack Map**: See arrows from attack source countries
- **📋 Events Log**: View all requests with payloads
- **📊 Analytics**: 
  - Real-time request volume
  - Attack type distribution
  - **Blocked IPs Table** (shows all blocked attacks)
- **🔍 Inspector Panel**: Click any event for detailed analysis

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Check if WAF is reachable
telnet YOUR_WAF_IP 80

# If fails: Windows firewall is blocking
# Solution on Windows:
# 1. Windows Defender Firewall
# 2. Inbound Rules → New Rule
# 3. Port → TCP 80 → Allow
```

### Module Not Found
```bash
# Install dependencies
pip3 install --user flask requests

# Or use sudo
sudo pip3 install flask requests
```

### Port 5001 Already in Use
```bash
# Find process using port
sudo lsof -i :5001

# Kill the process
sudo kill -9 PID

# Or change port in kali_sim.py:
# app.run(host='0.0.0.0', port=5002)
```

### VM Can't Reach Windows Host

**Check VM Network Settings:**

1. **VirtualBox**: Settings → Network → Attached to: "Bridged Adapter"
2. **VMware**: Edit → Virtual Network Editor → Bridge to actual network
3. **Hyper-V**: Virtual Switch Manager → External Network

Then restart VM and try `ping YOUR_WAF_IP` again.

---

## 🎓 Architecture Overview

```
┌─────────────────┐
│   Kali Linux    │
│  (Attack Sim)   │
│  Port: 5001     │
└────────┬────────┘
         │ HTTP Requests
         │ (with spoofed IPs)
         ▼
┌─────────────────┐
│  Windows Host   │
├─────────────────┤
│  Nginx (Port 80)│◄── Entry Point
│      ↓          │
│  WAF Engine     │◄── AI Analysis
│      ↓          │
│  PostgreSQL     │◄── Logging
│      ↓          │
│  Dashboard:3000 │◄── Visualization
└─────────────────┘
```

---

## 🚨 Security Features Being Tested

✅ **Signature Detection**: Pattern matching for known attacks
✅ **AI-Powered Analysis**: Machine learning threat detection
✅ **GeoIP Tracking**: Attack origin identification
✅ **Rate Limiting**: DDoS protection
✅ **IP Blacklisting**: Automatic blocking of repeat offenders
✅ **Real-time Monitoring**: WebSocket updates
✅ **Attack Classification**: Categorization by type

---

## 📝 Quick Reference Commands

```bash
# ON KALI LINUX:

# Clone repository
git clone https://github.com/vedantkhangale/NEW_AI_WAF.git

# Install dependencies
pip3 install flask requests

# Run simulator
cd NEW_AI_WAF/simulator
python3 kali_sim.py

# Access web interface
firefox http://localhost:5001

# Check Kali IP (for Windows access)
ip addr show | grep inet

# Test WAF connectivity
curl http://YOUR_WAF_IP
```

```powershell
# ON WINDOWS HOST:

# Start WAF stack
cd D:\REVOX_AI_WAF
docker-compose up -d

# Check services
docker ps

# View WAF logs
docker logs aegisx-waf-engine --tail 50

# Access dashboard
http://localhost:3000
```

---

## 🚨 Legal Disclaimer

**IMPORTANT**: This simulator is designed to test **YOUR OWN WAF** installation only.

- ✅ **Legal**: Testing your own infrastructure
- ❌ **Illegal**: Targeting systems you don't own
- ⚠️ **Always**: Get written permission before security testing

The simulated "attacks" are harmless test strings designed to trigger WAF rules. They don't exploit actual vulnerabilities.

---

## 🎯 Demo Tips

Perfect flow for presentations:

1. **Start WAF Stack** (Windows):
   ```powershell
   docker-compose up -d
   ```

2. **Open Dashboard** (Windows):
   - Browser: http://localhost:3000
   - Full screen the Global Attack Map

3. **Launch Simulator** (Kali):
   ```bash
   python3 kali_sim.py
   firefox http://localhost:5001
   ```

4. **Run Various Attacks**:
   - Start with Legitimate Traffic → See ALLOWED ✅
   - Try SQL Injection → See BLOCKED 🛡️
   - Launch XSS Attack → See BLOCKED 🛡️
   - Watch the map light up in real-time!

5. **Show Analytics Tab**:
   - Real request volumes
   - Attack type distribution
   - Blocked IPs table

---

**Ready to test your WAF! Happy hacking! 🚀🛡️**
