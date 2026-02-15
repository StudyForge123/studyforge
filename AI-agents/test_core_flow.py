import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000/api"

def test_core_flow():
    print("🚀 Testing Core Workflow (Create -> Upload -> Generate)")
    
    # 1. Create Class
    print("\n1. Creating Class 'Physics 101'...")
    try:
        resp = requests.post(f"{BASE_URL}/classes", json={"name": "Physics 101"})
        if resp.status_code == 200:
            class_id = resp.json()["class_id"]
            print(f"✅ Class Created: ID={class_id}")
        else:
            print(f"❌ Create Failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Create Error: {e}")
        return

    # 2. Upload Syllabus
    print("\n2. Uploading Syllabus...")
    # Create a dummy PDF file
    with open("dummy_syllabus.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n%Dummy PDF Content")
    
    try:
        files = {'file': ('syllabus.pdf', open('dummy_syllabus.pdf', 'rb'), 'application/pdf')}
        resp = requests.post(f"{BASE_URL}/classes/{class_id}/upload/syllabus", files=files)
        if resp.status_code == 200:
            file_id = resp.json()["file_id"]
            print(f"✅ Syllabus Uploaded: ID={file_id}")
        else:
            print(f"❌ Upload Failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Upload Error: {e}")
        return
    finally:
        if os.path.exists("dummy_syllabus.pdf"):
            os.remove("dummy_syllabus.pdf")

    # 3. Generate Calendar
    print("\n3. Generating Calendar...")
    try:
        payload = {"class_ids": [class_id]}
        resp = requests.post(f"{BASE_URL}/calendar/generate", json=payload)
        
        if resp.status_code == 200:
            events = resp.json().get("events", [])
            print(f"✅ Calendar Generated: {len(events)} events found")
            print("Note: 0 events is expected for dummy PDF as it has no dates.")
        else:
            print(f"❌ Generate Failed: {resp.text}")
    except Exception as e:
        print(f"❌ Generate Error: {e}")

if __name__ == "__main__":
    test_core_flow()
