import re

with open('../api/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning views.py for Matrimony views and endpoints...")
for i, line in enumerate(lines):
    line_num = i + 1
    # look for class declarations or functions containing matrimony or profiles
    if 'class ' in line and ('Matrimony' in line or 'Profile' in line):
        print(f"Line {line_num}: {line.strip()}")
    elif 'def ' in line and ('recommended' in line.lower() or 'matching' in line.lower() or 'discover' in line.lower() or 'search' in line.lower()):
        print(f"Line {line_num}: {line.strip()}")
