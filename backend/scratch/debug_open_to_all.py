"""
Debug script: Check why priyanshi (Gujarat, PLATFORM_WIDE) doesn't show
to member2 (Surat community).
Run from backend/ dir: python manage.py shell < scratch/debug_open_to_all.py
"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import MatrimonyProfile, User
from api.visibility_engine import MatrimonyVisibilityService, PrivacyEngine
from api.preference_engine import PreferenceEngine

SEP = "=" * 60

def check_visibility_flow(cand_username, viewer_username):
    print(SEP)
    print(f"CANDIDATE: {cand_username}  |  VIEWER: {viewer_username}")
    print(SEP)

    try:
        cand_user = User.objects.get(username=cand_username)
    except User.DoesNotExist:
        print(f"[ERROR] Candidate user '{cand_username}' not found")
        return

    try:
        viewer_user = User.objects.get(username=viewer_username)
    except User.DoesNotExist:
        print(f"[ERROR] Viewer user '{viewer_username}' not found")
        return

    cand_prof = MatrimonyProfile.objects.filter(user=cand_user, deleted_at__isnull=True).first()
    viewer_prof = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()

    if not cand_prof:
        print(f"[ERROR] No matrimony profile for candidate {cand_username}")
        return
    if not viewer_prof:
        print(f"[ERROR] No matrimony profile for viewer {viewer_username}")
        return

    print(f"\nCANDIDATE PROFILE:")
    print(f"  ID           : {cand_prof.id}")
    print(f"  Name         : {cand_prof.name}")
    print(f"  Status       : {cand_prof.status}")
    print(f"  is_verified  : {cand_prof.is_verified}")
    print(f"  visibility_type : {cand_prof.visibility_type}")
    print(f"  hierarchy_scope : {cand_prof.hierarchy_scope}")
    c_comm = cand_prof.community
    print(f"  Community    : {c_comm.name if c_comm else 'None'} (id={cand_prof.community_id})")

    print(f"\nVIEWER PROFILE:")
    print(f"  ID           : {viewer_prof.id}")
    print(f"  Name         : {viewer_prof.name}")
    print(f"  Status       : {viewer_prof.status}")
    print(f"  is_verified  : {viewer_prof.is_verified}")
    v_comm = viewer_prof.community
    print(f"  Community    : {v_comm.name if v_comm else 'None'} (id={viewer_prof.community_id})")

    # --- STEP 1: can_appear_in_listings ---
    print(f"\n[CHECK 1] can_appear_in_listings:")
    result = MatrimonyVisibilityService.can_appear_in_listings(cand_prof, viewer_user)
    print(f"  Result = {result}")

    # --- STEP 2: canViewProfile ---
    print(f"\n[CHECK 2] PrivacyEngine.canViewProfile:")
    result2 = PrivacyEngine.canViewProfile(cand_prof, viewer_user)
    print(f"  Result = {result2}")

    # --- STEP 3: check_visibility_and_privacy ---
    print(f"\n[CHECK 3] PreferenceEngine.check_visibility_and_privacy:")
    vis, reason = PreferenceEngine.check_visibility_and_privacy(viewer_prof, cand_prof)
    print(f"  Visible = {vis}, Reason = {reason}")

    # --- STEP 4: check_mandatory_filters ---
    print(f"\n[CHECK 4] PreferenceEngine.check_mandatory_filters (viewer's prefs on candidate):")
    try:
        pref = viewer_prof.partner_preference
        match, reason = PreferenceEngine.check_mandatory_filters(viewer_prof, cand_prof)
        print(f"  Viewer pref gender={pref.gender}, age={pref.min_age}-{pref.max_age}")
        print(f"  Match = {match}, Reason = {reason}")
    except Exception as e:
        print(f"  No preference or error: {e}")

    # --- STEP 5: reciprocal ---
    print(f"\n[CHECK 5] PreferenceEngine.check_mandatory_filters (candidate's prefs on viewer):")
    try:
        cpref = cand_prof.partner_preference
        match2, reason2 = PreferenceEngine.check_mandatory_filters(cand_prof, viewer_prof)
        print(f"  Candidate pref gender={cpref.gender}, age={cpref.min_age}-{cpref.max_age}")
        print(f"  Match = {match2}, Reason = {reason2}")
    except Exception as e:
        print(f"  No preference or error: {e}")

    print(f"\n[SUMMARY] visibility_type={cand_prof.visibility_type}")
    if cand_prof.visibility_type == 'PLATFORM_WIDE':
        print("  >>> This is OPEN TO ALL — should be visible to EVERYONE (bypass prefs)")
    print(SEP)


# Test both directions
check_visibility_flow('priyanshi', 'member2')
check_visibility_flow('member2', 'priyanshi')
