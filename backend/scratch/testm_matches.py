import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile, InterestRequest
from api.preference_engine import PreferenceEngine
from api.visibility_engine import MatrimonyVisibilityService, PrivacyEngine

my_profile = MatrimonyProfile.objects.filter(name='testm', deleted_at__isnull=True).first()
if my_profile:
    print(f"My Profile: ID={my_profile.id}, User={my_profile.user}, Status={my_profile.status}, Verified={my_profile.is_verified}")
    print(f"My Gender: {my_profile.gender}")
    
    candidates = MatrimonyProfile.objects.filter(
        status__in=['Approved', 'Active', 'Featured'],
        deleted_at__isnull=True,
    ).exclude(id=my_profile.id)
    print(f"Total candidates: {candidates.count()}")
    
    for p in candidates:
        print(f"\nCandidate: {p.name} (ID: {p.id})")
        print(f"  Status: {p.status}, Verified: {p.is_verified}, Visibility: {p.visibility_type}")
        print(f"  Gender: {p.gender}, Age: {p.age}")
        
        visible, reason = PreferenceEngine.check_visibility_and_privacy(my_profile, p)
        print(f"  Visibility Check: {visible} ({reason})")
        
        match_viewer, reason_v = PreferenceEngine.check_mandatory_filters(my_profile, p)
        print(f"  My Filters on Cand: {match_viewer} ({reason_v})")
        
        match_cand, reason_c = PreferenceEngine.check_mandatory_filters(p, my_profile)
        print(f"  Cand Filters on Me: {match_cand} ({reason_c})")
else:
    print("Profile 'testm' not found")
