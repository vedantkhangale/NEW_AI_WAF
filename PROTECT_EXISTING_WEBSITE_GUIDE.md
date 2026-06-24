# How to Protect Your Existing Website with AegisX WAF

AegisX WAF operates as a **Reverse Proxy**. This means it sits *in front* of your actual website, inspecting all incoming traffic. If the traffic is safe, it forwards it to your website. If it is an attack, it blocks it and drops the connection before it ever reaches your server.

This guide will show you how to point the WAF to protect your existing web application.

---

## 🏗️ Architecture Overview

```mermaid
graph LR
    A[Attacker/Visitor] -->|Port 80/443| B(AegisX Nginx Proxy)
    B -->|Analyzes Traffic| C{AegisX WAF Engine}
    C -->|If Safe (Allow)| D[Your Actual Website]
    C -->|If Attack (Block)| E[Connection Dropped]
```

By default, the AegisX simulator points to a dummy test target. To protect your real website, you only need to change **one line** in the configuration.

---

## 🛠️ Step-by-Step Guide

### Step 1: Open the `nginx.conf` file
Navigate to the `nginx` directory in your WAF folder and open `nginx.conf` in an editor.

Path: `d:\REVOX_AI_WAF\nginx\nginx.conf` (or wherever your repo is installed).

### Step 2: Locate the Upstream Target block
Scroll down until you see the `location /` block inside the `server { ... }` configuration. 

It currently looks like this:
```nginx
location / {
    # 1. Run WAF Check
    access_by_lua_file /usr/local/openresty/nginx/lua/access.lua;
    
    # 2. Proxy to your actual application
    # THIS IS THE LINE YOU MUST CHANGE 👇
    proxy_pass http://host.docker.internal:8080; 
}
```

### Step 3: Change the `proxy_pass` URL
Change `http://host.docker.internal:8080` to point to **your real website's Host IP or domain name**.

**Examples:**
* If your NodeJS/Django app runs on the same server on port 3000:
  `proxy_pass http://host.docker.internal:3000;`
* If your real website is on another Virtual Machine with IP 192.168.1.50:
  `proxy_pass http://192.168.1.50:80;`
* If you want to protect a live domain:
  `proxy_pass https://your-backend-api.com;`

*Save the file after editing.*

### Step 4: Restart the WAF Proxy
Since we modified the Nginx configuration, we need to restart the proxy container so it picks up the new target.

Run this command in your terminal from the `REVOX_AI_WAF` directory:
```bash
docker-compose restart nginx-proxy
```

---

## ✅ Step 5: Verify Protection
That's it! 
To test if it's working:
1. Open your browser and go to `http://localhost/` (or your server's IP). 
2. You should see **your own website** load successfully.
3. Now, try adding `/?id=1' OR '1'='1` to the end of the URL.
4. The request will immediately be blocked, and you will see the attack show up live on the AegisX Dashboard!

### Important: DNS Configuration (Production Only)
If you are deploying this to the live internet, you must point your Domain's A-Record (e.g., `www.mycoolsite.com`) to the **IP address of the server running the AegisX WAF**, NOT the IP address of your actual web server. Your actual web server should ideally be firewalled to only accept connections originating from the WAF IP.
