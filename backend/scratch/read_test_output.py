import sys

# Reconfigure stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

with open('../test_output.txt', 'r', encoding='utf-16le') as f:
    lines = f.readlines()

print("Scanning test_output.txt for 'fail' or 'error' or 'exception'...")
found = False
for i, line in enumerate(lines):
    lower_line = line.lower()
    if 'fail' in lower_line or 'error' in lower_line or 'exception' in lower_line or 'traceback' in lower_line:
        # Ignore our print logs: "Gender Check FAIL", "Final Result FAIL", etc.
        if 'check' in lower_line or 'result' in lower_line or 'returned' in lower_line or 'visibility mode' in lower_line:
            continue
        print(f"Match on line {i+1}: {line.strip()}")
        # print context
        start = max(0, i - 5)
        end = min(len(lines), i + 20)
        print("--- CONTEXT ---")
        for idx in range(start, end):
            # Strip BOM
            content = lines[idx].replace('\ufeff', '')
            print(f"{idx+1}: {content}", end='')
        print("---------------\n")
        found = True
        break

if not found:
    print("No matches found.")
