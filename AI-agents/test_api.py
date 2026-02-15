import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_dashboard():
    print("Testing Dashboard Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard")
        if response.status_code == 200:
            print("✅ Dashboard OK:", response.json())
        else:
            print("❌ Dashboard Failed:", response.status_code, response.text)
    except Exception as e:
        print("❌ Dashboard Error:", e)

def test_chat():
    print("\nTesting Chat Endpoint...")
    try:
        payload = {"mode": "Study Session", "message": "Hello, this is a test."}
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        if response.status_code == 200:
            print("✅ Chat OK:", response.json())
        else:
            print("❌ Chat Failed:", response.status_code, response.text)
    except Exception as e:
        print("❌ Chat Error:", e)

def test_classes():
    print("\nTesting Classes Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/classes")
        if response.status_code == 200:
            classes = response.json().get("classes", [])
            print(f"✅ Classes OK: Found {len(classes)} classes")
        else:
            print("❌ Classes Failed:", response.status_code, response.text)
    except Exception as e:
        print("❌ Classes Error:", e)

if __name__ == "__main__":
    test_dashboard()
    test_chat()
    test_classes()
