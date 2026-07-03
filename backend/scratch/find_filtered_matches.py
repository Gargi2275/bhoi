with open(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\src\routes\dashboard.matrimony.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'filteredMatches' in line:
            print(f"{i+1}: {line.strip()}")
