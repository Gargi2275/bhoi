import os, re

files = [
  r'src/routes/admin.advertisements.tsx',
  r'src/components/wag/AdBanner.tsx',
  r'src/components/wag/CommunityHierarchy.tsx',
  r'src/routes/community-admin.families.tsx',
  r'src/routes/community-admin.gallery.tsx',
  r'src/routes/dashboard.matrimony.tsx',
  r'src/routes/dashboard.venues.tsx'
]

for f in files:
  path = os.path.join(os.getcwd(), f)
  with open(path, 'r', encoding='utf-8') as file:
    content = file.read()
  
  # Remove the dynamic hostname so it uses relative paths (handled by proxy)
  content = content.replace("`http://${window.location.hostname}:8000", "`")
  content = content.replace("`http://${window.location.hostname}:8000/", "`/")
  
  with open(path, 'w', encoding='utf-8') as file:
    file.write(content)
