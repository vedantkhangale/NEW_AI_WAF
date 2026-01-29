import requests
import json

try:
    response = requests.get('http://localhost:5000/api/requests')
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Count: {data.get('count')}")
    if data.get('requests'):
        print("First request:", json.dumps(data['requests'][0], indent=2))
    else:
        print("No requests found.")
        
except Exception as e:
    print(f"Error: {e}")
