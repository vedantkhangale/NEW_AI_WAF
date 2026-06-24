import requests
import time
import json

BASE_URL = "http://localhost:80"
API_BASE = "http://localhost:5000"

payloads = {
    "SQLi": "' OR 1=1 --",
    "XSS": "<script>alert('XSS')</script>",
    "Path Traversal": "../../../etc/passwd",
    "Command Injection": "; cat /etc/passwd",
    "Normal Request": "user=123"
}

results = {"auth": {}, "waf_blocks": {}, "latency": {}}

print("=== STARTING SECURITY VALIDATION ===")
latencies = []
for _ in range(5):
    start = time.time()
    try:
        r = requests.get(BASE_URL + "/?query=" + payloads["Normal Request"], timeout=2)
        latencies.append((time.time() - start) * 1000)
    except Exception as e:
        pass

if latencies:
    results["latency"]["average_ms"] = round(sum(latencies)/len(latencies), 2)
else:
    results["latency"]["average_ms"] = "Failed"

print("\n[*] Testing WAF Payloads...")
for name, payload in payloads.items():
    if name == "Normal Request": continue
    try:
        r = requests.get(BASE_URL + "/?q=" + payload, timeout=2)
        status = r.status_code
        results["waf_blocks"][name] = "Blocked" if status == 403 else f"Bypassed (Status {status})"
        print(f"    [{status}] {name}")
    except Exception as e:
        results["waf_blocks"][name] = "Error"
        print(f"    [Error] {name}: {e}")

try:
    auth_resp = requests.post(API_BASE + "/api/auth/login", json={"username": "admin", "password": "AegisX@2026"})
    if auth_resp.status_code == 200:
        results["auth"]["login"] = "Success"
        token = auth_resp.json().get("token")
        bad_auth = requests.post(API_BASE + "/api/auth/verify", headers={"Authorization": "Bearer BAD_TOKEN"})
        results["auth"]["invalid_token_rejected"] = bad_auth.status_code == 401
    else:
        results["auth"]["login"] = f"Failed (Status {auth_resp.status_code})"
except Exception as e:
    results["auth"]["login"] = f"Error: {e}"

print(json.dumps(results, indent=2))
