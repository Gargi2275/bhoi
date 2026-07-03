import os
import sys
import django
from django.test import Client

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import User, MatrimonyProfile

user = User.objects.filter(username='member2').first()
if not user:
    # try by profile name
    p = MatrimonyProfile.objects.filter(name__icontains='member2').first()
    if p:
        user = p.user

print(f"Testing for user: {user.username}")

client = Client()
client.force_login(user)

response = client.get('/api/matrimony-profiles/matches/')
print(f"Response status: {response.status_code}")
data = response.json()
print(f"Total returned profiles: {len(data['results'] if 'results' in data else data)}")
for p in (data['results'] if 'results' in data else data):
    print(f" - {p.get('id')}: {p.get('name')} ({p.get('gender')})")
