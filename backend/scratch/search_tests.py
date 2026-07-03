with open('../api/tests.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning tests.py for 'target_'...")
for i, line in enumerate(lines):
    if 'target_' in line:
        print(f"Line {i+1}: {line.strip()}")
