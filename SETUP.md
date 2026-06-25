# AegisX WAF – Complete Setup Guide

## Overview
This document walks you through installing **AegisX AI‑Powered Web Application Firewall** on a brand‑new machine with **no pre‑installed software**. It covers three environments:
- **Windows 11 (desktop)**
- **Windows Server 2022**
- **Ubuntu 22.04 LTS** (or later)

The guide installs **all required runtime components**, configures **Docker** and **Docker‑Compose**, pulls the GeoIP database, and shows how to start/stop the stack.

---

## 1. Common Prerequisites (All OSes)
1. **Git** – needed to clone the repository.
2. **Docker Engine** (latest stable) – runs the WAF engine, AI service, and dashboard.
3. **Docker‑Compose** – orchestrates the multi‑container stack.
4. **Python 3.10+** – required only for optional local AI model training (not needed for the pre‑built AI service).
5. **Node.js (v18 LTS) & npm** – required to build the React dashboard if you want to modify it.
6. **MaxMind GeoLite2 City database** – provides IP‑to‑location lookup.
7. **A terminal with admin/root privileges** – Docker on Windows needs admin rights; on Linux you’ll need `sudo`.

The sections below list the exact installation commands for each platform.

---

## 2. Windows 11 (Desktop) Setup
### 2.1 Install Git
```powershell
# Open PowerShell as Administrator
winget install --id Git.Git -e --source winget
```
### 2.2 Install Docker Desktop
1. Download Docker Desktop for Windows from https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Run the installer, accept the defaults, and **restart** when prompted.
3. After restart, open Docker Desktop and ensure it shows **“Docker is running”**.
4. Enable **WSL 2 backend** (Docker will install WSL 2 automatically if missing).

### 2.3 Install Node.js & npm
```powershell
winget install OpenJS.NodeJS -e --source winget
# Verify
node -v
npm -v
```
### 2.4 Install Python (optional, for AI model training)
```powershell
winget install Python.Python.3.10
python -m pip install --upgrade pip
```
### 2.5 Clone the repository
```powershell
mkdir C:\AegisX && cd C:\AegisX
git clone https://github.com/vedantkhangale/NEW_AI_WAF.git
cd NEW_AI_WAF
```
### 2.6 Download GeoIP database
```powershell
# Create folder
mkdir geoip
# Open a browser, go to https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
# Download GeoLite2-City.mmdb and place it in the geoip folder
```
### 2.7 Build and start the stack
```powershell
# Ensure Docker is running (Docker Desktop must be open)
.
# Use the provided scripts
.
# Start all services
.
.
```
(Actually the scripts are `start_waf.bat` and `stop_waf.bat` – see later.)

### 2.8 Start / Stop commands
```powershell
# Start
.
.
# Stop
.
```
(We will keep the original bat files; they call `docker-compose up -d` etc.)

---

## 3. Windows Server 2022 Setup
The steps are similar to Windows 11 but use **Server‑Core** or **Desktop Experience**.
### 3.1 Install required Windows features
```powershell
Install-WindowsFeature -Name Containers, Hyper-V, Microsoft-Hyper-V-All
# Reboot if required
```
### 3.2 Install Docker Engine (not Docker Desktop)
```powershell
# Install the DockerMsftProvider
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force
Restart-Computer -Force
```
After reboot, verify:
```powershell
docker version
```
### 3.3 Install Git, Node.js, Python (same Winget commands as Windows 11) – Winget works on Server 2022.
```powershell
winget install --id Git.Git -e
winget install OpenJS.NodeJS -e
winget install Python.Python.3.10 -e
```
### 3.4 Clone repo and download GeoIP (same steps as Windows 11) – use PowerShell or `Invoke-WebRequest` for the mmdb file.
```powershell
mkdir C:\AegisX && cd C:\AegisX
git clone https://github.com/vedantkhangale/NEW_AI_WAF.git
cd NEW_AI_WAF
mkdir geoip
# Example download via PowerShell (replace YOUR_LICENSE_KEY)
$url = "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_LICENSE_KEY&suffix=tar.gz"
Invoke-WebRequest -Uri $url -OutFile geoip.tar.gz
# Extract (requires 7‑zip or tar)
 tar -xzf geoip.tar.gz --strip-components=1 -C geoip
```
### 3.5 Start the stack
```powershell
# The batch files work the same; just run them from PowerShell
.
.
```
---

## 4. Ubuntu (22.04 LTS or later) Setup
### 4.1 Update the system
```bash
sudo apt update && sudo apt upgrade -y
```
### 4.2 Install required packages
```bash
# Git, curl, build‑essential (for node), python3‑venv, unzip
sudo apt install -y git curl build-essential python3-pip python3-venv unzip
```
### 4.3 Install Docker Engine & Docker‑Compose
```bash
# Install Docker’s official repository
sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
sudo apt-get update
sudo apt-get install -y ca-certificates gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
# Verify
sudo docker run --rm hello-world
```
Add your user to the `docker` group to avoid `sudo` on every command:
```bash
sudo usermod -aG docker $USER
newgrp docker   # refresh group membership in current session
```
### 4.4 Install Node.js (v18 LTS) via Nodesource
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```
### 4.5 Install Python (usually pre‑installed) – ensure version 3.10+:
```bash
python3 --version   # should be 3.10 or newer
# If older, use deadsnakes PPA
```
### 4.6 Clone repository
```bash
mkdir -p ~/aegisx && cd ~/aegisx
git clone https://github.com/vedantkhangale/NEW_AI_WAF.git
cd NEW_AI_WAF
```
### 4.7 Download GeoIP database
```bash
mkdir -p geoip
cd geoip
# Direct download (replace LICENSE_KEY with your MaxMind key)
wget "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_LICENSE_KEY&suffix=tar.gz" -O GeoLite2-City.tar.gz
tar -xzf GeoLite2-City.tar.gz --strip-components=1 *.mmdb
cd ..
```
### 4.8 Build & start the stack
```bash
# The repository ships with docker‑compose.yml
docker compose up -d   # or: docker-compose up -d if you have the legacy binary
```
### 4.9 Verify services
```bash
# Dashboard UI
curl -s http://localhost:3000 | grep -i "AegisX"
# API health check
curl -s http://localhost:5000/api/stats | jq .
```
### 4.10 Stop the stack
```bash
docker compose down   # or docker-compose down
```
---

## 5. Common Post‑Installation Checks
| Component | URL / Command | Expected outcome |
|-----------|---------------|-------------------|
| Dashboard UI | `http://localhost:3000` | Login page appears (default credentials: `admin / AegisX@2026`). |
| API health | `curl http://localhost:5000/api/stats` | JSON payload with current statistics. |
| WebSocket | Open browser console, run `new WebSocket('ws://localhost:5000/ws')` | Should connect without error. |
| GeoIP lookup | In the dashboard, map points should show city/country names. |

If any of the above fails, consult the Docker logs:
```bash
docker compose logs -f   # tail logs of all services
```
---

## 6. FAQ & Troubleshooting
1. **Docker daemon not running** – On Windows, start Docker Desktop; on Linux, run `sudo systemctl start docker`.
2. **Port conflicts** – Ensure ports 3000 (dashboard), 5000 (API), 80/443 (optional Nginx) are free.
3. **GeoIP file not found** – Verify the file is named `GeoLite2-City.mmdb` and located in `./geoip/` relative to the project root.
4. **Out‑of‑memory errors** – Adjust Docker Desktop memory allocation (Settings → Resources) to at least 4 GB.
5. **TLS/HTTPS** – For production, terminate TLS at the Nginx reverse proxy (`docker/nginx/nginx.conf`). Generate certificates (Let’s Encrypt) and update the `nginx.conf` `ssl_certificate` paths.

---

## 7. Clean Removal
To completely remove the WAF stack from a machine:
```bash
# Stop containers
docker compose down -v   # also removes volumes
# Remove images (optional)
docker image prune -a
# Delete the cloned directory
rm -rf ~/aegisx/NEW_AI_WAF   # Linux/macOS
# On Windows, delete the folder via Explorer or `rd /s /q C:\AegisX`
```
---

*This guide is kept up‑to‑date as of **June 2026**. For newer OS releases or package versions, refer to the official Docker, Node.js, and MaxMind documentation.*
