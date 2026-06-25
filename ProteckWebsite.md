# ProtectWebsite.md – Guide to Securing Your Website with AegisX WAF

## 📖 What is AegisX WAF?
AegisX is an AI‑powered **Web Application Firewall** that sits in front of your web server and filters inbound traffic before it reaches your application. It can:
- Block known attacks (SQLi, XSS, RFI, etc.)
- Detect anomalous behaviour with a lightweight ML model
- Provide real‑time visualisation on the dashboard
- Store request logs for forensic analysis

The firewall is packaged as Docker containers, so you do **not** need to write any code to get it running – only a few configuration steps.

---

## 🛠️ Prerequisites (same for new or existing sites)
| Item | Why we need it | Installation command (Windows PowerShell) |
|------|----------------|-------------------------------------------|
| **Git** | To clone the AegisX repository | `winget install --id Git.Git -e` |
| **Docker Desktop** | Runs the WAF engine, AI service, and dashboard | Download from https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe and run the installer |
| **MaxMind GeoLite2 City DB** | Enables IP‑to‑location lookup for the map | See step *Download GeoIP Database* below |
| **(Optional) Node.js** | Needed only if you plan to modify the dashboard UI | `winget install OpenJS.NodeJS -e` |
| **A terminal with admin rights** | Docker on Windows requires elevated privileges |

> **Note:** All commands below assume you are in a PowerShell window **run as Administrator**. On Linux/macOS replace `winget` with your package manager (`apt`, `brew`, etc.).

---

## 🚀 Quick Start for a New Website (development mode)
1. **Clone the repository**
   ```powershell
   mkdir C:\AegisX && cd C:\AegisX
   git clone https://github.com/vedantkhangale/NEW_AI_WAF.git
   cd NEW_AI_WAF
   ```
2. **Download the GeoIP database**
   ```powershell
   mkdir geoip
   # Open a browser, go to https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   # Download `GeoLite2-City.mmdb` and place it in the newly created `geoip` folder.
   ```
3. **Start the whole stack**
   ```powershell
   .\start_waf.bat   # This runs `docker-compose up -d` under the hood
   ```
   Docker will pull all images (Postgres, Redis, Nginx, AI service, Dashboard) and start them.
4. **Create a simple web app** (optional)
   - For a quick test you can run the built‑in *simulator* which sends attacks to the firewall:
     ```powershell
     docker exec aegisx-simulator curl -s http://localhost:8080/trigger?type=xss
     ```
5. **Open the dashboard**
   - Navigate to `http://localhost:3000` in a browser.
   - Login with the default credentials (`admin / AegisX@2026`).
   - You should see the **Global Attack Map** and a list of blocked requests.

Now any request that reaches `http://localhost` (the Nginx reverse‑proxy) is inspected by AegisX before being forwarded to your actual web service.

---

## 🏗️ Protecting an **Existing** Production Site
Assume you already have a web server (e.g., an Apache/Node/ASP.NET app) listening on **port 80** or **443**. The goal is to route all traffic through the WAF.

### 1️⃣ Deploy the AegisX stack on the same host (or a separate VM)
Follow steps **1‑3** from *Quick Start* above. Make sure the stack is running.

### 2️⃣ Configure the Nginx reverse‑proxy (provided in `nginx/nginx.conf`)
Edit `nginx/nginx.conf` to point `UPSTREAM_APP_URL` to *your* application URL.
```nginx
# Inside the http block of nginx.conf
upstream backend {
    # Change this to the real address of your app.
    # If the app runs on the same host on port 8080:
    server host.docker.internal:8080;  # Docker for Windows host bridge
}

server {
    listen 80;
    # Optional TLS – see the TLS section below
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Let AegisX inspect the request first
        proxy_set_header X-WAF-ENABLED true;
    }
}
```
After editing, reload the Nginx container:
```powershell
docker exec aegisx-nginx nginx -s reload
```
The proxy now forwards *all* inbound traffic to your original service **after** the WAF has evaluated it.

### 3️⃣ DNS & TLS (production‑grade)
1. **Domain name** – point your domain’s A‑record to the server’s public IP.
2. **TLS termination** – let Nginx handle HTTPS. Generate a certificate (Let’s Encrypt is recommended):
   ```bash
   # On the host (Linux example)
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   ```
   Then mount the certs into the `nginx` container (add to `docker‑compose.yml` under `nginx-proxy`):
   ```yaml
   volumes:
     - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro
     - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/ssl/private/privkey.pem:ro
   ```
   Update `nginx.conf` to listen on **443** and reference those cert files:
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /etc/ssl/certs/fullchain.pem;
       ssl_certificate_key /etc/ssl/private/privkey.pem;
       ...
   }
   ```
3. Restart the Nginx container again.

### 4️⃣ Verify protection
- Open `http://yourdomain.com` (or `https://` if TLS enabled) in a browser.
- Open the dashboard (`http://<host‑ip>:3000`).
- Generate a test request (e.g., `curl -H "User-Agent: <script>alert(1)</script>" http://yourdomain.com`) and confirm it appears as **BLOCKED** in the dashboard.

---

## 📋 Checklist (what you should have after setup)
- ✅ Docker containers for **postgres, redis, ai‑service, waf‑engine, nginx‑proxy, dashboard** are running (`docker ps`).
- ✅ `geoip/GeoLite2‑City.mmdb` exists.
- ✅ Nginx `nginx.conf` points to your real backend.
- ✅ DNS points to the server, TLS certificates are mounted (if using HTTPS).
- ✅ Dashboard shows live attacks and statistics.
- ✅ All normal traffic reaches your original web app, while malicious traffic is blocked and logged.

---

## 🛡️ Common Pitfalls & Fixes
| Issue | Likely cause | Fix |
|-------|--------------|-----|
| **Dashboard shows “No data”** | GeoIP DB missing or path wrong | Ensure `geoip/GeoLite2‑City.mmdb` is present and volume mount `./geoip:/app/geoip:ro` is correct. |
| **404 from `/api/health`** | Wrong health‑endpoint URL | Use `http://localhost:5000/healthz` or check `waf‑engine/main.py` for the exact path. |
| **All requests are blocked** | Nginx `proxy_set_header X‑WAF‑ENABLED true;` missing or mis‑configured rules | Confirm the header is present; check `waf‑engine/services/regex_engine.py` for rule definitions. |
| **TLS handshake fails** | Certificate files not mounted or permissions incorrect | Verify mount paths in `docker‑compose.yml` and that files are readable inside the container (`docker exec aegisx-nginx ls -l /etc/ssl`). |
| **Docker container restarts continuously** | Health‑check failure (e.g., DB not ready) | Run `docker logs <container>` to see the error, then increase `depends_on` `condition: service_healthy` timeouts if necessary. |

---

## 🎉 You’re Ready!
You now have a fully functional **AegisX WAF** protecting either a brand‑new site you are developing or an existing production website. All traffic is filtered, logged, and visualised without you writing any firewall rules yourself.

Feel free to explore the **Dashboard → Rules Manager** to create custom blocking patterns or adjust the AI model confidence thresholds.

**Happy securing!**
