import requests
import time
import json
import concurrent.futures
from urllib.parse import urljoin

BASE_URL = "http://host.docker.internal"
API_BASE = "http://host.docker.internal:5000"

payloads = {
    "SQLi": "' OR 1=1 --",
    "XSS": "<script>alert('XSS')</script>",
    "Path Traversal": "../../../etc/passwd",
    "Command Injection": "; cat /etc/passwd",
    "Normal Request": "user=123"
}

results = {
    "auth": {},
    "waf_blocks": {},
    "latency": {},
    "load": {}
}

print("=== STARTING SECURITY VALIDATION ===")

# 1. Test Legitimate Traffic & Latency
print("\n[*] Testing Legitimate Traffic Latency...")
latencies = []
for _ in range(10):
    start = time.time()
    try:
        r = requests.get(BASE_URL + "/?query=" + payloads["Normal Request"], timeout=2)
        latencies.append((time.time() - start) * 1000)
    except:
        pass

if latencies:
    avg_latency = sum(latencies)/len(latencies)
    results["latency"]["average_ms"] = round(avg_latency, 2)
    print(f"    Average Latency: {avg_latency:.2f} ms")
else:
    results["latency"]["average_ms"] = "Failed"

# 2. Test Core WAF Engine Blocking
print("\n[*] Testing WAF Payloads...")
for name, payload in payloads.items():
    if name == "Normal Request": continue
    try:
        r = requests.get(BASE_URL + "/?q=" + payload, timeout=2)
        status = r.status_code
        results["waf_blocks"][name] = "Blocked" if status == 403 else f"Bypassed (Status {status})"
        print(f"    [{status}] {name}")
    except Exception as e:
        print(f"    [ERROR] {name}: {e}")
        results["waf_blocks"][name] = "Error"

# 3. Test Authentication
print("\n[*] Testing Authentication API...")
try:
    auth_resp = requests.post(API_BASE + "/api/auth/login", json={"username": "admin", "password": "AegisX@2026"})
    if auth_resp.status_code == 200:
        token = auth_resp.json().get("token")
        results["auth"]["login"] = "Success"
        
        # Test auth bypass / bad token
        bad_auth = requests.post(API_BASE + "/api/auth/verify", headers={"Authorization": "Bearer BAD_TOKEN"})
        results["auth"]["invalid_token_rejected"] = bad_auth.status_code == 401
    else:
        results["auth"]["login"] = f"Failed (Status {auth_resp.status_code})"
except Exception as e:
    results["auth"]["login"] = f"Error: {e}"
print(f"    Auth test complete: {results['auth']}")

# Print JSON report
print("\n=== RAW RESULTS JSON ===")
print(json.dumps(results, indent=2))
