import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference

cand = MatrimonyProfile.objects.filter(name__icontains='member').exclude(name__icontains='member2').exclude(name__icontains='member3').first()
print(f"Modifying candidate: {cand.name} (Gender: {cand.gender})")
pref = PartnerPreference.objects.filter(profile=cand).first()
if pref:
    pref.gender = 'Groom'
    pref.save()
    print("Set preference gender to Groom")
else:
    print("No preference found")

