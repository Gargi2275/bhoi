with open('../api/models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning models.py for 'visibility'...")
for i, line in enumerate(lines):
    if 'visibility' in line.lower():
        print(f"Line {i+1}: {line.strip()}")
