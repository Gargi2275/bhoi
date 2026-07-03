with open(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\src\routes\dashboard.matrimony.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Scanning dashboard.matrimony.tsx for API calls...")
for i, line in enumerate(lines):
    if '/api/' in line or 'fetch(' in line or 'axios' in line or 'api.' in line or 'matches' in line:
        print(f"Line {i+1}: {line.strip()}")
