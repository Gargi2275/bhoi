import subprocess
import sys

res = subprocess.run(
    [sys.executable, "backend/manage.py", "test", "api.tests"],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

# Print only failures/errors part from stderr
lines = res.stderr.split('\n')
err_started = False
err_lines = []
for line in lines:
    if "=====================" in line or "FAIL:" in line or "ERROR:" in line or err_started:
        err_started = True
        err_lines.append(line)

print("FAILURES AND ERRORS:")
print("\n".join(err_lines))
print("EXIT CODE:", res.returncode)
