import re

with open('../api/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning views.py for MatrimonyProfile references...")
for i, line in enumerate(lines):
    line_num = i + 1
    if 'MatrimonyProfile.objects' in line:
        print(f"Line {line_num}: {line.strip()}")
