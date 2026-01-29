import requests

try:
    print("Calling debug insert...")
    response = requests.post('http://localhost:5000/api/debug/insert')
    print(f"Status: {response.status_code}")
    print("Response:", response.text)
except Exception as e:
    print(f"Error: {e}")
