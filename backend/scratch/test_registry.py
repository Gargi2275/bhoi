import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method, headers=headers)
    if data is not None:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            return status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"Error {e.code}: {body}")
        raise e

# Login
status, tokens = make_request(f"{BASE_URL}/auth/login/", "POST", {
    "username": "admin",
    "password": "admin123"
})
print("Login status:", status)
token = tokens.get("access")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 1. Fetch modules
status, modules = make_request(f"{BASE_URL}/modules/", "GET", headers=headers)
print("Fetch modules status:", status)
print("Total modules in DB:", len(modules))

# 2. Trigger Scan Layouts
status, scan_res = make_request(f"{BASE_URL}/modules/scan/", "POST", headers=headers)
print("Scan layouts status:", status, scan_res)

# 3. Create a module
status, created_module = make_request(f"{BASE_URL}/modules/", "POST", {
    "module_code": "hrms-test",
    "display_name": "HRMS Test",
    "category": "Administration",
    "icon": "Box",
    "route": "/dashboard/hrms-test",
    "sort_order": 999,
    "is_sidebar_module": True,
    "is_active": True,
    "supports_subscription": True,
    "supports_permissions": True
}, headers=headers)
print("Create module status:", status)
print("Created module ID:", created_module.get("id"))

# 4. Clone module
status, cloned_module = make_request(f"{BASE_URL}/modules/{created_module['id']}/clone/", "POST", headers=headers)
print("Clone module status:", status)
print("Cloned module Display Name:", cloned_module.get("display_name"))

# 5. Check audit logs
status, audit_logs = make_request(f"{BASE_URL}/module-audit-logs/", "GET", headers=headers)
print("Audit logs count:", len(audit_logs))

# 6. Delete created module
status, _ = make_request(f"{BASE_URL}/modules/{created_module['id']}/", "DELETE", headers=headers)
print("Delete module status:", status)

# 7. Check if sidebar modules are loaded correctly
status, sidebar_modules = make_request(f"{BASE_URL}/modules/sidebar/", "GET", headers=headers)
print("Sidebar modules count:", len(sidebar_modules))
