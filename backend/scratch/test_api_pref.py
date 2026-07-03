import urllib.request
import urllib.parse
import json

def test_pref():
    base_url = "http://localhost:8000"
    
    # 1. Login
    login_url = f"{base_url}/api/auth/login/"
    login_data = json.dumps({
        "username": "member@gmail.com",
        "password": "Admin@123"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            access_token = res_data.get("access") or res_data.get("token")
            print("Login successful!")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Get Profile to find ID
    profile_url = f"{base_url}/api/matrimony-profiles/my-profile/"
    req_get = urllib.request.Request(
        profile_url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    try:
        with urllib.request.urlopen(req_get) as response:
            profile = json.loads(response.read().decode("utf-8"))
            profile_id = profile.get("id")
            print(f"Profile ID: {profile_id}")
    except Exception as e:
        print(f"Failed to fetch profile: {e}")
        return

    # 3. Get Preferences
    pref_url = f"{base_url}/api/matrimony-profiles/preferences/?profile_id={profile_id}"
    req_pref_get = urllib.request.Request(
        pref_url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    try:
        with urllib.request.urlopen(req_pref_get) as response:
            pref = json.loads(response.read().decode("utf-8"))
            print("Preferences retrieved:", pref)
    except Exception as e:
        print(f"Failed to fetch preferences: {e}")
        return

    # 4. Save Preferences
    pref_data = {
        "gender": "Bride",
        "min_age": 20,
        "max_age": 55,
        "caste": "Ahir",
        "state": "Gujarat",
        "country": "India"
    }
    
    req_pref_post = urllib.request.Request(
        pref_url,
        data=json.dumps(pref_data).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req_pref_post) as response:
            updated_pref = json.loads(response.read().decode("utf-8"))
            print("Updated preferences:", updated_pref)
            assert updated_pref.get("min_age") == 20
            assert updated_pref.get("max_age") == 55
            assert updated_pref.get("caste") == "Ahir"
            print("Preferences API test passed successfully!")
    except Exception as e:
        print(f"Failed to save preferences: {e}")

if __name__ == "__main__":
    test_pref()
