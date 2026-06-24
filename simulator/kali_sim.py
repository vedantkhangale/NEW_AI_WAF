
import requests
import time
import random
import os
import argparse
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# --- CONFIGURATION ---
# Kali needs to know where the WAF is.
# Default to an Env Var or a placeholder
WAF_TARGET = os.environ.get("WAF_HOST", "http://192.168.1.100:80") 
SIMULATOR_PORT = 5555

# --- ATTACK CATALOG (Same as Host) ---
ATTACK_CATALOG = {
    "sql_injection": {
        "name": "SQL Injection",
        "icon": "💉",
        "severity": "critical",
        "payloads": ["UNION SELECT * FROM users--", "' OR '1'='1", "admin' --"]
    },
    "xss_attack": {
        "name": "XSS Attack",
        "icon": "🔥",
        "severity": "high",
        "payloads": ["<script>alert('XSS')</script>", "<img src=x onerror=alert(1)>"]
    },
    "path_traversal": {
        "name": "Path Traversal",
        "icon": "📂",
        "severity": "critical",
        "payloads": ["../../../../etc/passwd", "..\\..\\windows\\system32\\cmd.exe"]
    },
    "ssrf": {
        "name": "SSRF",
        "icon": "🌐",
        "severity": "high",
        "payloads": ["http://169.254.169.254/latest/meta-data/", "http://localhost:6379"]
    },
    "legitimate_traffic": {
        "name": "Legitimate Traffic",
        "icon": "✅",
        "severity": "safe",
        "payloads": ["/products?id=123", "/search?q=laptop", "/login"]
    },
    "traffic_flood": {
        "name": "Traffic Flood",
        "icon": "🌊",
        "severity": "medium",
        "payloads": ["/api/data?limit=1000", "/large-file.zip"]
    }
}

# --- GEOIP SPOOFING & FIXED IPs ---
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

FIXED_IP_POOLS = {}
for country, prefix in COUNTRY_PREFIXES.items():
    FIXED_IP_POOLS[country] = [f"{prefix}.{i}.{random.randint(10, 200)}" for i in range(1, 11)]

stats = { "total_requests": 0, "blocked": 0, "allowed": 0 }

def send_request(attack_type, payload, country, custom_ip=None):
    global stats
    try:
        # Ensure payload starts with /
        if not payload.startswith('/'):
            payload = '/' + payload
            
        url = f"{WAF_TARGET}{payload}"
        
        if custom_ip and custom_ip.strip():
            spoofed_ip = custom_ip.strip()
        else:
            spoofed_ip = get_attacker_ip(country)
            
        headers = {
            "X-Forwarded-For": spoofed_ip,
            "User-Agent": "AegisX Kali Simulator",
            "X-Simulated": "true"
        }
        
        start_time = time.time()
        try:
            response = requests.get(url, headers=headers, timeout=10, allow_redirects=False)
            latency = int((time.time() - start_time) * 1000)
            blocked = response.status_code == 403
            
            stats["total_requests"] += 1
            if blocked: stats["blocked"] += 1
            else: stats["allowed"] += 1
                
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
        except requests.exceptions.ConnectionError:
             return {
                "attack_type": attack_type,
                "payload": payload,
                "error": "Connection Refused (WAF Unreachable)",
                "blocked": False,
                "timestamp": time.strftime("%H:%M:%S")
            }
            
    except Exception as e:
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
                         mode=f"KALI LINUX MODE (Target: {WAF_TARGET})")

@app.route('/api/attack', methods=['POST'])
def launch_attack():
    data = request.json
    attack_type = data.get('attack_type')
    payload = data.get('payload')
    if not payload: payload = random.choice(ATTACK_CATALOG[attack_type]['payloads'])
    country = data.get('country', 'United States')
    custom_ip = data.get('custom_ip')
    return jsonify(send_request(attack_type, payload, country, custom_ip))

@app.route('/api/batch-attack', methods=['POST'])
def batch_attack():
    data = request.json
    attack_type = data.get('attack_type')
    count = int(data.get('count', 10))
    country = data.get('country', 'United States')
    custom_ip = data.get('custom_ip')
    
    payloads = ATTACK_CATALOG[attack_type]["payloads"]
    results = []
    for i in range(count):
        payload = payloads[i % len(payloads)]
        results.append(send_request(attack_type, payload, country, custom_ip))
        time.sleep(0.2)
        
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
    parser = argparse.ArgumentParser(description='AegisX Kali Simulator')
    parser.add_argument('--target', help='WAF Host URL (e.g. http://192.168.1.5:80)')
    args = parser.parse_args()
    
    if args.target:
        WAF_TARGET = args.target
        
    print(f"[*] Starting Kali Simulator on http://0.0.0.0:{SIMULATOR_PORT}")
    print(f"[*] Target WAF: {WAF_TARGET}")
    app.run(host='0.0.0.0', port=SIMULATOR_PORT)
