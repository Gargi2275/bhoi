import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile
for p in MatrimonyProfile.objects.all():
    print(f"ID={p.id}, Name={p.name}, Gender='{p.gender}'")
