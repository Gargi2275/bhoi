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
  
  # For template literals like `http://localhost:8000${...}`
  content = content.replace("`http://localhost:8000", "`http://${window.location.hostname}:8000")
  
  # For double quote strings like "http://localhost:8000/api..."
  content = re.sub(r'\"http://localhost:8000([^\"]*)\"', r'`http://${window.location.hostname}:8000\1`', content)
  
  # For single quote strings like 'http://localhost:8000/api...'
  content = re.sub(r'\'http://localhost:8000([^\']*)\'', r'`http://${window.location.hostname}:8000\1`', content)
  
  with open(path, 'w', encoding='utf-8') as file:
    file.write(content)
