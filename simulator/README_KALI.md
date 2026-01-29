# Running AegisX Attack Simulator from Kali Linux

## 🎯 Quick Start Guide

Your WAF is running on: **10.54.84.234**
Your simulator will run from: **Kali Linux VM**

---

## 📋 Step 1: Transfer the Script to Kali Linux

You have several options:

### Option A: Direct Copy (Recommended)
If you have shared folders or can access Windows from Kali:

```bash
# From Kali Linux terminal
# If Windows drive is mounted (e.g., /mnt/d/ or /media/sf_D_DRIVE/)
cp /mnt/d/REVOX_AI_WAF/simulator/global_attack_sim.py ~/
```

### Option B: Use SCP (Secure Copy)
From your Kali Linux VM:

```bash
# Replace <WINDOWS_IP> with your Windows host IP
scp user@<WINDOWS_IP>:/d/REVOX_AI_WAF/simulator/global_attack_sim.py ~/
```

### Option C: Manual Copy/Paste
1. On Windows: Open `global_attack_sim.py` in notepad
2. Select All (Ctrl+A), Copy (Ctrl+C)
3. On Kali: Create new file: `nano ~/global_attack_sim.py`
4. Paste (Ctrl+Shift+V)
5. Save (Ctrl+O, Enter, Ctrl+X)

### Option D: Download from GitHub (if you push it)
```bash
wget https://raw.githubusercontent.com/YOUR_REPO/global_attack_sim.py
```

---

## 📦 Step 2: Install Python Dependencies

Kali Linux usually has Python 3 pre-installed. Install the required library:

```bash
# Update package list
sudo apt update

# Install pip if not installed
sudo apt install python3-pip -y

# Install requests library
pip3 install requests
```

---

## 🔧 Step 3: Verify Network Connectivity

**CRITICAL**: Your Kali VM must be able to reach the WAF host!

```bash
# Test connectivity
ping 10.54.84.234

# Expected output:
# 64 bytes from 10.54.84.234: icmp_seq=1 ttl=128 time=1.23 ms
# ✓ If you see replies, you're good to go!

# If ping fails, check:
# 1. VM network adapter set to "Bridged" (not NAT)
# 2. Windows Firewall allows incoming on port 80
# 3. Docker containers are running on Windows
```

### Verify WAF is Accessible

```bash
# Quick HTTP test
curl http://10.54.84.234

# Expected: HTML response or "Request blocked by WAF"
# If connection refused: WAF is not running or firewall blocking
```

---

## 🚀 Step 4: Run the Simulator

```bash
# Navigate to script location
cd ~

# Make executable (optional)
chmod +x global_attack_sim.py

# Run the simulator!
python3 global_attack_sim.py
```

---

## 🎬 Expected Output

You should see colorful Matrix-style output like this:

```
================================================================================
   ___           _     __  __    _____                 _       _             
  / _ \         (_)   |  \/  |  / ____|               | |     | |            
 | |_| | ___  __ _ ___ | \  / || (___   _   _   __ _ | |_ ___  _ __  
 |  _  |/ _ \/ _` |/ __|| |\/| | \___ \ | | | | / _` || __/ _ \| '__| 
 | | | |  __/ (_| | \__ \| |  | | ____) || |_| || (_| || || (_) | |    
 |_| |_|\___|\___, |/____/|_|  |_||_____/  \__, | \__,_| \__\___/|_|    
              __/ |                         __/ |                        
             |___/                         |___/

Global Attack Simulator - Distributed Geo-Spoofing Demo
⚠️  WARNING: FOR DEMONSTRATION PURPOSES ONLY

Target: http://10.54.84.234
Threads: 5 concurrent attackers
Countries: 7 (China, Russia, United States, Brazil, India, South Korea, Germany)
================================================================================

[INIT] Testing connection to http://10.54.84.234...
✓ WAF is reachable!

[START] Launching attack simulation...

[02:35:15] [001] 🇨🇳 China (202.106.0.20    ) → SQL Injection         → /?id=1' OR '1'='1                     ✗ BLOCKED
[02:35:17] [002] 🇷🇺 Russia (109.207.13.5   ) → XSS Attack           → /?name=<script>alert('XSS')</scri... ✗ BLOCKED
[02:35:19] [003] 🇺🇸 United States (8.8.8.8) → Legitimate           → /about                                 ✓ ALLOWED
[02:35:21] [004] 🇧🇷 Brazil (189.6.0.1      ) → Path Traversal       → /../../../etc/passwd                  ✗ BLOCKED
...
```

Meanwhile, on your **Windows Dashboard** (http://localhost:3000):
- **Global Attack Map**: Arrows appear from China → India, Russia → India, USA → India
- **Recent Events**: Shows attacks with correct source countries
- **Top IPs**: Lists 202.106.0.20 (Beijing), 109.207.13.5 (Moscow), etc.

---

## 🔥 Advanced: Customize the Attacks

### Increase Attack Rate
Edit the script on Kali:

```bash
nano ~/global_attack_sim.py
```

Change these lines:
```python
NUM_THREADS = 10      # More concurrent threads
ATTACK_INTERVAL = 1   # Faster attacks (1 second)
TOTAL_ATTACKS = 100   # More total attacks
```

### Add Your Own Attack Patterns
```python
ATTACK_PATTERNS = {
    "My Custom Attack": [
        "/custom?payload=malicious",
        "/admin?cmd=whoami",
    ]
}
```

### Run in Background
```bash
# Run in background with nohup
nohup python3 global_attack_sim.py > attack_log.txt 2>&1 &

# Check if running
ps aux | grep global_attack

# View live output
tail -f attack_log.txt
```

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Check if WAF host is reachable
telnet 10.54.84.234 80

# If fails: Windows firewall is blocking
# Solution on Windows:
# 1. Windows Defender Firewall
# 2. Inbound Rules → New Rule
# 3. Port → TCP 80 → Allow
```

### Module Not Found: requests
```bash
# Install again
pip3 install --user requests

# Or use sudo
sudo pip3 install requests
```

### VM Can't Reach Windows Host
**Check VM Network Settings:**

1. **VirtualBox**: Settings → Network → Attached to: "Bridged Adapter"
2. **VMware**: Edit → Virtual Network Editor → Bridge to actual network
3. **Hyper-V**: Virtual Switch Manager → External Network

Then restart VM and try `ping 10.54.84.234` again.

### Script Permission Denied
```bash
chmod +x global_attack_sim.py
# Or just use: python3 global_attack_sim.py
```

---

## 📊 Demo Script for Presentations

Perfect flow for showing your project:

1. **Open 3 Terminal Windows on Kali**:
   - Terminal 1: `watch -n 1 curl -s http://10.54.84.234` (monitor WAF)
   - Terminal 2: `python3 global_attack_sim.py` (run attacks)
   - Terminal 3: `tail -f ~/attack_log.txt` (if running in background)

2. **Open Dashboard on Windows**:
   - Browser: http://localhost:3000
   - Full screen the Global Attack Map

3. **Start Simulator**:
   - Run the script
   - Watch map light up with arrows from multiple countries

4. **Explain the Architecture**:
   - "This is a distributed WAF with AI-powered threat detection"
   - "The Kali VM simulates attacks from 7 countries"
   - "The WAF uses GeoIP to track attack origins"
   - "Notice the arrows showing attack paths in real-time"

---

## 🎓 Why This is Impressive

**What you're demonstrating:**

✅ **Multi-tier Architecture**: Nginx → WAF Engine → AI Service → Dashboard
✅ **Distributed Systems**: Cross-VM communication
✅ **Real-time Analytics**: WebSocket updates, live maps
✅ **Security Patterns**: IP spoofing detection, geo-blocking
✅ **DevOps**: Docker orchestration, microservices
✅ **Networking**: Bridged VMs, firewall configuration
✅ **Full-stack**: Python backend, React frontend, Lua middleware

Perfect for:
- University final year projects
- Security internship applications
- DevSecOps portfolio
- Cybersecurity competitions

---

## 📝 Quick Reference Commands

```bash
# ON KALI LINUX:

# Test connectivity
ping 10.54.84.234

# Copy script
cp /mnt/d/REVOX_AI_WAF/simulator/global_attack_sim.py ~/

# Install dependency
pip3 install requests

# Run simulator
python3 ~/global_attack_sim.py

# Run in background
nohup python3 ~/global_attack_sim.py > attack.log 2>&1 &

# Stop background process
pkill -f global_attack_sim
```

---

## 🚨 Legal Disclaimer

**IMPORTANT**: This simulator is designed to test YOUR OWN WAF installation only.

- ✅ **Legal**: Testing your own infrastructure
- ❌ **Illegal**: Targeting systems you don't own
- ⚠️ **Always**: Get written permission before security testing

The simulated "attacks" are harmless test strings designed to trigger WAF rules. They don't exploit actual vulnerabilities.

---

**Ready to go! Let me know if you hit any issues! 🚀**
