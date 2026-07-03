import subprocess
import sys

res = subprocess.run(
    [sys.executable, "backend/manage.py", "test", "api.tests.MatrimonyProductionReadinessAuditTests"],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
print("EXIT CODE:", res.returncode)
