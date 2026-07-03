with open('../api/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning views.py for 'MatrimonyProfileSerializer'...")
for i, line in enumerate(lines):
    if 'MatrimonyProfileSerializer' in line:
        print(f"Line {i+1}: {line.strip()}")
