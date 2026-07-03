import os
import sys
import django
from django.test import Client

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import User, MatrimonyProfile

p = MatrimonyProfile.objects.filter(name__icontains='member2').first()
user = p.user
client = Client()
client.force_login(user)

response = client.get('/api/matrimony-profiles/matches/')
data = response.json()
print("Matches API returned:")
for p in (data['results'] if 'results' in data else data):
    print(f" - {p.get('id')}: {p.get('name')} ({p.get('gender')})")
