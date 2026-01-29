import requests
import json
import time

def verify():
    print("1. Sending request with custom headers...")
    try:
        headers = {
            "X-Wireshark-Test": "Captured",
            "User-Agent": "WiresharkVerifier/1.0"
        }
        resp = requests.get("http://localhost/", headers=headers, timeout=5)
        print(f"   Request sent. Status: {resp.status_code}")
    except Exception as e:
        print(f"   Request failed: {e}")
        return

    print("2. Waiting for async logging...")
    time.sleep(2)

    print("3. Checking API for logs...")
    try:
        api_resp = requests.get("http://localhost:5000/api/requests")
        data = api_resp.json().get('requests', [])
        
        found = False
        for event in data:
            # Check if headers key exists and contains our header
            event_headers = event.get('headers')
            if event_headers:
                # API might return it as a dict or string depending on implementation
                if isinstance(event_headers, str):
                    event_headers = json.loads(event_headers)
                
                if event_headers.get('x-wireshark-test') == 'Captured' or \
                   event_headers.get('X-Wireshark-Test') == 'Captured':
                    print("   [SUCCESS] Found log with 'X-Wireshark-Test: Captured'")
                    found = True
                    break
        
        if not found:
            print("   [FAILURE] Custom header not found in recent logs.")
            print("   Recent events:", json.dumps(data[:1], indent=2))
            
    except Exception as e:
        print(f"   API check failed: {e}")

if __name__ == "__main__":
    verify()
