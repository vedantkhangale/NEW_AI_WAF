# AegisX Interactive Simulator - Kali Linux Setup Guide

## 🎯 What This Is

Instead of running the command-line simulator, you'll have a **beautiful web interface** where you can:
- **Click** on attack types (SQL Injection, XSS, etc.)
- **Choose** specific payloads from a dropdown
- **Select** which country to spoof
- **Launch** individual attacks or batch attacks
- **See** real-time results showing BLOCKED/ALLOWED
- **Monitor** statistics (total requests, block rate, etc.)

Perfect for live demos and presentations!

---

## 📸 What It Looks Like

```
╔═══════════════════════════════════════════════════════════╗
║  🛡️ AegisX WAF - Interactive Attack Simulator            ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  [Stats Bar]                                              ║
║  Total: 47  |  Blocked: 35  |  Allowed: 12  |  74% Block ║
║                                                            ║
║  ┌─────────────────────────────────────────┐              ║
║  │ 🗄️ SQL Injection      [SELECTED]       │              ║
║  │ ⚡ XSS Attack                           │              ║
║  │ 📁 Path Traversal                       │              ║
║  │ 💻 Command Injection                    │              ║
║  │ 🌐 SSRF                                 │              ║
║  │ ✅ Legitimate Requests                  │              ║
║  └─────────────────────────────────────────┘              ║
║                                                            ║
║  Choose Payload:                                          ║
║  ┌────────────────────────────────────────┐              ║
║  │ /?id=1' OR '1'='1                      │ ← Selected   ║
║  │ /?user=admin'--                        │              ║
║  │ /search?q='; DROP TABLE users--        │              ║
║  └────────────────────────────────────────┘              ║
║                                                            ║
║  Country: [China ▼]                                       ║
║                                                            ║
║  [🚀 Launch Selected Attack]                              ║
║  [💥 Launch All Payloads (Batch)]                         ║
║                                                            ║
║  Recent Results:                                          ║
║  ┌────────────────────────────────────────┐              ║
║  │ 02:45:12 | China | 🛑 BLOCKED          │              ║
║  │ SQL Injection | /?id=1' OR '1'='1      │              ║
║  └────────────────────────────────────────┘              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🚀 Step-by-Step Setup on Kali Linux

### Step 1: Transfer Files to Kali

You need to copy 2 files files from Windows to Kali:
1. `interactive_simulator.py` (Flask backend)
2. `templates/index.html` (Web UI)

**Option A - Shared Folder (Easiest)**:
```bash
# If Windows drive is mounted
mkdir ~/aegisx-simulator
cp /mnt/d/REVOX_AI_WAF/simulator/interactive_simulator.py ~/aegisx-simulator/
cp -r /mnt/d/REVOX_AI_WAF/simulator/templates ~/aegisx-simulator/
cd ~/aegisx-simulator
```

**Option B - SCP from Kali**:
```bash
mkdir ~/aegisx-simulator
scp user@<WINDOWS_IP>:"/d/REVOX_AI_WAF/simulator/interactive_simulator.py" ~/aegisx-simulator/
scp -r user@<WINDOWS_IP>:"/d/REVOX_AI_WAF/simulator/templates" ~/aegisx-simulator/
cd ~/aegisx-simulator
```

**Option C - Manual Copy/Paste**:
```bash
mkdir ~/aegisx-simulator
mkdir ~/aegisx-simulator/templates
nano ~/aegisx-simulator/interactive_simulator.py
# (Paste content, Ctrl+O, Enter, Ctrl+X)

nano ~/aegisx-simulator/templates/index.html
# (Paste content, Ctrl+O, Enter, Ctrl+X)

cd ~/aegisx-simulator
```

---

### Step 2: Install Dependencies

```bash
# Update package list
sudo apt update

# Install pip if needed
sudo apt install python3-pip -y

# Install Flask (web framework)
pip3 install flask

# Install requests library
pip3 install requests
```

---

### Step 3: Verify WAF Connection

```bash
# Test if you can reach the WAF
ping 10.54.84.234

# Test HTTP connection
curl http://10.54.84.234
```

---

### Step 4: Run the Interactive Simulator

```bash
cd ~/aegisx-simulator
python3 interactive_simulator.py
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════╗
║  AegisX WAF - Interactive Attack Simulator            ║
╚════════════════════════════════════════════════════════╝

Target WAF: http://10.54.84.234
Web UI:     http://0.0.0.0:5555

From another machine, access:
http://<YOUR_KALI_IP>:5555

Starting server...
 * Serving Flask app 'interactive_simulator'
 * Running on http://0.0.0.0:5555
```

---

### Step 5: Open the Web UI

**Option A - On Kali Itself**:
```bash
# Open Firefox (already installed on Kali)
firefox http://localhost:5555 &
```

**Option B - From Windows**:
1. Find your Kali IP: `ip addr show` (look for something like `192.168.1.x`)
2. On Windows browser: `http://192.168.1.x:5555`

---

## 🎮 How to Use

### Basic Workflow

1. **Select Attack Type**
   - Click on any attack card (SQL Injection, XSS, etc.)
   - Card will highlight in yellow

2. **Choose Payload**
   - Dropdown appears showing all payloads
   - Select the specific one you want

3. **Pick Country**
   - Choose which country to spoof (China, Russia, USA, etc.)

4. **Launch!**
   - Click **"Launch Selected Attack"** for one request
   - Click **"Launch All Payloads (Batch)"** for multiple

5. **Watch Results**
   - Results appear instantly below
   - Shows BLOCKED (red) or ALLOWED (green)
   - Displays latency, timestamp, country

---

## 🎬 Perfect for Demos

### Demo Script

**Narrator**: "Now I'll demonstrate our WAF's ability to detect and block sophisticated attacks from around the world."

**Action 1** *(Click on SQL Injection card)*:
"Here I'm selecting a SQL Injection attack vector. The WAF will see what appears to be an attack from Beijing, China."

**Action 2** *(Select payload from dropdown)*:
"I'm choosing this specific payload - a classic SQL injection attempt using OR '1'='1' to bypass authentication."

**Action 3** *(Click "Launch Selected Attack")*:
"Sending the attack now..."

**Result** *(Red BLOCKED appears)*:
"And as you can see, the WAF immediately detected and blocked it! The response came back in just 15 milliseconds."

**Action 4** *(Click "Launch All Payloads (Batch)")*:
"Let me launch a batch of various SQL injection attempts..."

**Result** *(Multiple red BLOCKED)*:
"The WAF successfully blocked all 5 attack variations."

**Action 5** *(Select "Legitimate Requests" card)*:
"Now let's verify it doesn't block normal traffic..."

**Action 6** *(Launch legitimate request)*:
"And you can see legitimate requests are allowed through without issue."

**Conclusion**:
"Notice the statistics at the top - 74% block rate, meaning most malicious traffic is stopped while legitimate users can access the site normally."

---

## 🔧 Customization

### Change WAF Target

Edit `interactive_simulator.py`:
```python
WAF_TARGET = "http://10.54.84.234"  # Change to your WAF IP
```

### Change Web UI Port

```python
KALI_PORT = 5555  # Change to any available port
```

### Add Your Own Attacks

In `interactive_simulator.py`, add to `ATTACK_CATALOG`:
```python
"my_custom_attack": {
    "name": "My Custom Attack",
    "icon": "🔥",
    "severity": "critical",
    "payloads": [
        "/my/malicious/path?param=bad",
        "/another/attack",
    ]
}
```

### Add More Countries

```python
COUNTRY_IPS = {
    "Japan": "126.0.0.1",
    "Australia": "1.0.0.1",
    # ... add more
}
```

---

## 🐛 Troubleshooting

### Port 5555 Already in Use

```bash
# Find what's using it
sudo netstat -tlnp | grep 5555

# Kill the process (if safe)
sudo kill <PID>

# Or change the port in interactive_simulator.py
```

### Web UI Not Loading

```bash
# Check if Flask is running
ps aux | grep interactive_simulator

# Check firewall
sudo ufw status

# Allow port 5555
sudo ufw allow 5555
```

### Can't Access from Windows

**Ensure Kali's firewall allows it**:
```bash
sudo ufw allow from 10.54.84.0/24 to any port 5555
```

**Check VM network mode**:
- Must be **Bridged** (not NAT)
- Settings → Network → Attached to: "Bridged Adapter"

### Flask Not Found

```bash
# Install for user only
pip3 install --user flask requests

# Or with sudo
sudo pip3 install flask requests
```

---

## 📊 Advanced Features

### Run in Background

```bash
# Run in background
nohup python3 interactive_simulator.py > simulator.log 2>&1 &

# Check if running
ps aux | grep interactive_simulator

# View logs
tail -f simulator.log

# Stop
pkill -f interactive_simulator
```

### Auto-start on Boot

```bash
# Create systemd service
sudo nano /etc/systemd/system/aegisx-simulator.service
```

Add:
```ini
[Unit]
Description=AegisX Attack Simulator
After=network.target

[Service]
Type=simple
User=kali
WorkingDirectory=/home/kali/aegisx-simulator
ExecStart=/usr/bin/python3 interactive_simulator.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable aegisx-simulator
sudo systemctl start aegisx-simulator
sudo systemctl status aegisx-simulator
```

---

## 🎓 Why This is Better for Demos

**✅ Visual Appeal**: Clicking cards is more engaging than terminal commands

**✅ Precision Control**: Choose exactly which attack to launch

**✅ Real-time Feedback**: Instant visual results

**✅ Professional**: Looks like enterprise security software

**✅ Easy to Explain**: Non-technical people can understand

**✅ Repeatable**: Easy to demo the same attack multiple times

**✅ Statistics**: Shows aggregate data clearly

---

## 📝 Quick Command Reference

```bash
# ON KALI LINUX:

# Setup
mkdir ~/aegisx-simulator && cd ~/aegisx-simulator
pip3 install flask requests

# Run simulator
python3 interactive_simulator.py

# Access UI
firefox http://localhost:5555 &

# Or from Windows
# http://<KALI_IP>:5555

# Check if running
ps aux | grep interactive_simulator

# Stop
Ctrl+C (or pkill -f interactive_simulator)
```

---

**You're ready for an impressive, professional demo! 🚀**
