import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference, User

# Find member2
my_profile = MatrimonyProfile.objects.filter(name__icontains='member2').first()
if not my_profile:
    print("Matrimony profile for member2 not found")
    sys.exit()
user = my_profile.user

my_profile = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()
if not my_profile:
    print("Matrimony profile for member2 not found")
    sys.exit()

print(f"My Profile: ID={my_profile.id}, Name={my_profile.name}, Gender={my_profile.gender}, Age={my_profile.age}, Status={my_profile.status}, Verified={my_profile.is_verified}")

pref = PartnerPreference.objects.filter(profile=my_profile).first()
if pref:
    print(f"My Preferences: Gender={pref.gender}, Age={pref.min_age}-{pref.max_age}, Marital={pref.marital_status}, Caste={pref.caste}, Income={pref.income_range}")
else:
    print("No preferences found for my_profile")

print("\n--- ALL OTHER PROFILES ---")
candidates = MatrimonyProfile.objects.exclude(id=my_profile.id)
print(f"Total other profiles in DB: {candidates.count()}")

active_candidates = candidates.filter(status__in=['Approved', 'Active', 'Featured'], deleted_at__isnull=True)
print(f"Active/Approved/Featured other profiles: {active_candidates.count()}")

for c in active_candidates:
    print(f"Candidate: ID={c.id}, Name={c.name}, Gender={c.gender}, Age={c.age}, Status={c.status}, Verified={c.is_verified}, VisType={c.visibility_type}")

print("\n--- MATCHING CHECK ---")
from api.preference_engine import PreferenceEngine

filtered_candidates = PreferenceEngine.applyMandatoryFilters(my_profile, active_candidates)
print(f"After applyMandatoryFilters, remaining: {filtered_candidates.count()}")

for c in filtered_candidates:
    print(f"Candidate {c.id} ({c.name}) passed mandatory filters.")
    match_viewer, reason_v = PreferenceEngine.check_mandatory_filters(my_profile, c)
    print(f"  check_mandatory_filters(my_profile, c) -> {match_viewer}, reason: {reason_v}")
    
    match_cand, reason_c = PreferenceEngine.check_mandatory_filters(c, my_profile)
    print(f"  check_mandatory_filters(c, my_profile) -> {match_cand}, reason: {reason_c}")
    
    vis, v_reason = PreferenceEngine.check_visibility_and_privacy(my_profile, c)
    print(f"  check_visibility_and_privacy(my_profile, c) -> {vis}, reason: {v_reason}")

    score = PreferenceEngine.calculateMatchScore(my_profile, c)
    print(f"  calculateMatchScore -> {score.get('score')}")
