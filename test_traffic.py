import requests
import time

try:
    print("Sending request to WAF Proxy...")
    # Send a request that should be logged (and potentially blocked)
    response = requests.get(
        'http://localhost:80/',
        headers={'X-Forwarded-For': '1.2.3.4', 'User-Agent': 'TestScript'},
        timeout=5
    )
    print(f"Response Status: {response.status_code}")
    
    print("Waiting for async logging...")
    time.sleep(2)
    
    print("Checking API...")
    api_response = requests.get('http://localhost:5000/api/requests')
    data = api_response.json()
    print(f"API Count: {data.get('count')}")
    if data.get('requests'):
        print("Logged Request IP:", data['requests'][0]['source_ip'])
        print("Logged Action:", data['requests'][0]['action'])
        
except Exception as e:
    print(f"Error: {e}")
