with open('../api/serializers.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning serializers.py for 'visibility_type'...")
for i, line in enumerate(lines):
    if 'visibility_type' in line.lower():
        print(f"Line {i+1}: {line.strip()}")
