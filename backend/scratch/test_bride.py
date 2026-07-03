import os
import sys
import django
from django.test import Client

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference

p = MatrimonyProfile.objects.filter(name__icontains='member2').first()

client = Client()
client.force_login(p.user)

response = client.get('/api/matrimony-profiles/matches/')
data = response.json()
profiles = data.get('results') if isinstance(data, dict) else data
print(f"Matches API returned {len(profiles)} profiles:")
for p in profiles:
    print(f" - {p.get('id')}: {p.get('name')} ({p.get('gender')})")
