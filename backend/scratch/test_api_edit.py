import urllib.request
import urllib.parse
import json

def test_edit_profile():
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
            print("Login successful! Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Get Profile
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
            print("Get Profile details:")
            print(f"  visibility_type: {profile.get('visibility_type')}")
            print(f"  target_age_min: {profile.get('target_age_min')}")
            print(f"  target_age_max: {profile.get('target_age_max')}")
            print(f"  target_communities: {profile.get('target_communities')}")
    except Exception as e:
        print(f"Failed to fetch profile: {e}")
        return

    # 3. Patch Profile using frontend fields names
    patch_data = json.dumps({
        "visibility_scope": "Platform Wide",
        "filter_min_age": 22,
        "filter_max_age": 44,
        "filter_communities": [1]
    }).encode("utf-8")
    
    req_patch = urllib.request.Request(
        profile_url,
        data=patch_data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="PATCH"
    )
    
    try:
        with urllib.request.urlopen(req_patch) as response:
            updated_profile = json.loads(response.read().decode("utf-8"))
            print("Patch Profile response:")
            print(f"  visibility_type: {updated_profile.get('visibility_type')}")
            print(f"  target_age_min: {updated_profile.get('target_age_min')}")
            print(f"  target_age_max: {updated_profile.get('target_age_max')}")
            print(f"  target_communities: {updated_profile.get('target_communities')}")
            
            assert updated_profile.get("visibility_type") == "PLATFORM_WIDE", "visibility_type mapping failed"
            assert updated_profile.get("target_age_min") == 22, "target_age_min mapping failed"
            assert updated_profile.get("target_age_max") == 44, "target_age_max mapping failed"
            print("API edit test passed perfectly!")
    except Exception as e:
        print(f"Patch profile failed: {e}")

if __name__ == "__main__":
    test_edit_profile()
