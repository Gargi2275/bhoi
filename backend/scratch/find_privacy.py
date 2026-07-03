import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend\api\tests.py'
with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'gender=' in line:
            print(f"Line {i+1}: {line.strip()}")
