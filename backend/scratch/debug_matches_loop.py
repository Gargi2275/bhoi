import os
import sys
import django
from django.test import Client

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile
from api.preference_engine import PreferenceEngine

p = MatrimonyProfile.objects.filter(name__icontains='member2').first()
my_profile = p
all_profiles = MatrimonyProfile.objects.exclude(id=my_profile.id)

print(f"Testing loop for {my_profile.name} (Gender: {my_profile.gender})")
for profile in all_profiles:
    if profile.name in ['aryan jinjala', 'test', 'member3']:
        print(f"Checking {profile.name}...")
        match_viewer, reason_v = PreferenceEngine.check_mandatory_filters(my_profile, profile)
        match_cand, reason_c = PreferenceEngine.check_mandatory_filters(profile, my_profile)
        print(f"  match_viewer: {match_viewer} ({reason_v})")
        print(f"  match_cand: {match_cand} ({reason_c})")
