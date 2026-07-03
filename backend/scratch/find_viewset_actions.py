import re

with open('../api/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_viewset = False
for i, line in enumerate(lines):
    line_num = i + 1
    stripped = line.strip()
    if stripped.startswith('class MatrimonyProfileViewSet'):
        in_viewset = True
        print(f"Started at Line {line_num}")
    elif stripped.startswith('class ') and in_viewset:
        print(f"Exited at Line {line_num} due to: {stripped}")
        in_viewset = False
    
    if in_viewset:
        if 'def ' in line or '@action' in line:
            print(f"Line {line_num}: {stripped}")
