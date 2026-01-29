import requests
import time

def test_rate_limit():
    url = "http://localhost/"
    print("Sending 10 requests to trigger rate limit (Max 5/60s)...")
    
    for i in range(1, 11):
        try:
            resp = requests.get(url, timeout=2)
            # We expect Nginx to pass it to WAF, and WAF returns behavior.
            # But wait, WAF usually returns decision to Nginx? 
            # In this architecture, Nginx calls /api/analyze_request.
            # So hitting http://localhost/ (Nginx) triggers the flow.
            # If WAF blocks, Nginx returns 403.
            
            print(f"Req {i}: Status {resp.status_code}")
        except Exception as e:
            print(f"Req {i}: Failed {e}")
        # time.sleep(0.1)

if __name__ == "__main__":
    test_rate_limit()
