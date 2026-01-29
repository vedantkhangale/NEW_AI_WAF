
import requests
import time
import random
import threading
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# --- CONFIGURATION ---
# --- CONFIGURATION ---
import os
WAF_TARGET = os.environ.get("TARGET_URL", "http://localhost:80")  # Support Docker env var
SIMULATOR_PORT = 8080               # Docker expects 8080 (based on Dockerfile EXPOSE)

# --- ATTACK CATALOG ---
ATTACK_CATALOG = {
    "sql_injection": {
        "name": "SQL Injection",
        "icon": "💉",
        "severity": "critical",
        "payloads": [
            "UNION SELECT * FROM users--",
            "' OR '1'='1",
            "admin' --",
            "1; DROP TABLE users",
            "' UNION SELECT 1, @@version --"
        ]
    },
    "xss_attack": {
        "name": "XSS Attack",
        "icon": "🔥",
        "severity": "high",
        "payloads": [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:alert(1)",
            "<svg/onload=alert(1)>"
        ]
    },
    "path_traversal": {
        "name": "Path Traversal",
        "icon": "📂",
        "severity": "critical",
        "payloads": [
            "../../../../etc/passwd",
            "..\\..\\windows\\system32\\cmd.exe",
            "/var/www/html/../../../etc/shadow",
            "../../../boot.ini"
        ]
    },
    "ssrf": {
        "name": "SSRF",
        "icon": "🌐",
        "severity": "high",
        "payloads": [
            "http://169.254.169.254/latest/meta-data/",
            "http://localhost:6379",
            "http://127.0.0.1:22",
            "gopher://127.0.0.1:25"
        ]
    },
    "legitimate_traffic": {
        "name": "Legitimate Traffic",
        "icon": "✅",
        "severity": "safe",
        "payloads": [
            "/products?id=123",
            "/search?q=laptop",
            "/login",
            "/contact"
        ]
    },
    "traffic_flood": {
        "name": "Traffic Flood",
        "icon": "🌊",
        "severity": "medium",
        "payloads": [
            "/api/data?limit=1000",
            "/large-file.zip",
            "/random?nocache=1"
        ]
    }
}

# --- GEOIP SPOOFING & FIXED IPs ---
# Prefixes matched with WAF's mock GeoIP resolver
COUNTRY_PREFIXES = {
    "United States": "10.1",
    "China": "10.2",
    "Russia": "10.3",
    "Brazil": "10.4",
    "Germany": "10.5",
    "India": "10.6",
    "Japan": "10.7",
    "Australia": "10.8",
    "France": "10.9",
    "United Kingdom": "10.10",
}

# FIXED IP POOLS: 10 IPs per country
FIXED_IP_POOLS = {}
for country, prefix in COUNTRY_PREFIXES.items():
    FIXED_IP_POOLS[country] = [f"{prefix}.{i}.{random.randint(10, 200)}" for i in range(1, 11)]

# Stats
stats = {
    "total_requests": 0,
    "blocked": 0,
    "allowed": 0
}

def get_attacker_ip(country):
    """Get a random IP from the country's fixed pool of 10 IPs"""
    pool = FIXED_IP_POOLS.get(country, FIXED_IP_POOLS["United States"])
    return random.choice(pool)

def send_request(attack_type, payload, country, custom_ip=None):
    global stats
    try:
        # Ensure payload starts with /
        if not payload.startswith('/'):
            payload = '/' + payload
            
        url = f"{WAF_TARGET}{payload}"
        
        # Determine IP
        if custom_ip and custom_ip.strip():
            spoofed_ip = custom_ip.strip()
        else:
            spoofed_ip = get_attacker_ip(country)
            
        headers = {
            "X-Forwarded-For": spoofed_ip,
            "User-Agent": "AegisX Host Simulator",
            "X-Simulated": "true"
        }
        
        start_time = time.time()
        # Use allow_redirects=False to see the raw response
        response = requests.get(url, headers=headers, timeout=5, allow_redirects=False)
        latency = int((time.time() - start_time) * 1000)
        
        blocked = response.status_code == 403
        
        # Update stats
        stats["total_requests"] += 1
        if blocked:
            stats["blocked"] += 1
        else:
            stats["allowed"] += 1
            
        return {
            "attack_type": attack_type,
            "payload": payload,
            "country": country if not custom_ip else "Custom IP",
            "ip": spoofed_ip,
            "status_code": response.status_code,
            "blocked": blocked,
            "latency": latency,
            "timestamp": time.strftime("%H:%M:%S")
        }
    except Exception as e:
        import traceback
        print(f"DEBUG Error: {traceback.format_exc()}")
        return {
            "attack_type": attack_type,
            "payload": payload,
            "error": str(e),
            "blocked": False, 
            "timestamp": time.strftime("%H:%M:%S")
        }

@app.route('/')
def index():
    return render_template('clean_index.html', 
                         attacks=ATTACK_CATALOG, 
                         countries=list(COUNTRY_PREFIXES.keys()),
                         mode="HOST PC MODE")

@app.route('/api/attack', methods=['POST'])
def launch_attack():
    data = request.json
    attack_type = data.get('attack_type')
    if attack_type not in ATTACK_CATALOG:
        return jsonify({"error": "Invalid attack type"}), 400
        
    # If payload is generic, pick random one
    payload = data.get('payload')
    if not payload:
        payload = random.choice(ATTACK_CATALOG[attack_type]['payloads'])
        
    country = data.get('country', 'United States')
    custom_ip = data.get('custom_ip')
    
    result = send_request(attack_type, payload, country, custom_ip)
    return jsonify(result)

@app.route('/api/batch-attack', methods=['POST'])
def batch_attack():
    data = request.json
    attack_type = data.get('attack_type')
    count = int(data.get('count', 10))
    country = data.get('country', 'United States')
    custom_ip = data.get('custom_ip')
    
    payloads = ATTACK_CATALOG[attack_type]["payloads"]
    results = []
    
    # Loop 'count' times, cycling through payloads
    for i in range(count):
        payload = payloads[i % len(payloads)]
        res = send_request(attack_type, payload, country, custom_ip)
        results.append(res)
        time.sleep(0.1) # Fast batch
        
    return jsonify({"results": results})

@app.route('/api/stats')
def get_stats():
    return jsonify(stats)

@app.route('/api/test-connection')
def test_connection():
    try:
        requests.get(WAF_TARGET, timeout=2)
        return jsonify({"reachable": True, "target": WAF_TARGET})
    except:
        return jsonify({"reachable": False, "target": WAF_TARGET})

if __name__ == '__main__':
    print(f"[*] Starting Host Simulator on http://localhost:{SIMULATOR_PORT}")
    app.run(host='0.0.0.0', port=SIMULATOR_PORT, debug=True)
