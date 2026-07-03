import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference

my_profile = MatrimonyProfile.objects.filter(name__icontains='member2').first()
pref = PartnerPreference.objects.filter(profile=my_profile).first()
if pref:
    pref.gender = 'Bride'
    pref.save()
    print("Changed member2 preference to Bride")
else:
    print("No preferences found")
