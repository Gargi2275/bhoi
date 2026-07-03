import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference

m3 = MatrimonyProfile.objects.filter(name__icontains='member3').first()
if m3:
    p3 = PartnerPreference.objects.filter(profile=m3).first()
    if p3:
        print(f"member3 preferences: gender={p3.gender}, min_age={p3.min_age}, max_age={p3.max_age}")
    else:
        print("member3 has no preferences")
