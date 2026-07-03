import os
import django
import sys
import re

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db.models import Q
from api.models import MatrimonyProfile, InterestRequest, BlockedUser, PartnerPreference
from api.rule_engine import MatrimonyRuleEngine
from api.preference_engine import PreferenceEngine
from api.serializers import MatrimonyProfileSerializer

def parse_h_to_inches(h_val):
    if not h_val:
        return 0
    h_val = str(h_val).lower().strip()
    m = re.search(r"(\d+)\s*(?:'|ft|feet)\s*(\d+)?\s*(?:\"|in|inches)?", h_val)
    if m:
        ft = int(m.group(1))
        inch = int(m.group(2)) if m.group(2) else 0
        return ft * 12 + inch
    m_num = re.findall(r"\d+\.?\d*", h_val)
    if m_num:
        try:
            return float(m_num[0])
        except ValueError:
            pass
    return 0

def check_inc_range(candidate_income, range_val):
    if not range_val or range_val == 'Any':
        return True
    if not candidate_income:
        return False
    inc = str(candidate_income).lower()
    r_val = str(range_val).upper()
    if r_val == "UNDER 1L":
        return "under 1" in inc or "below 1" in inc or "less than 1" in inc
    if r_val == "1-3L":
        return "1-3" in inc or "2l" in inc or "3l" in inc
    if r_val == "3-5L":
        return "3-5" in inc or "4l" in inc or "5l" in inc
    if r_val == "5-10L":
        return "5-10" in inc or "6l" in inc or "7l" in inc or "8l" in inc or "9l" in inc or "10l" in inc
    if r_val == "10L+":
        return "10l+" in inc or "10+" in inc or "above 10" in inc or "12l" in inc or "15l" in inc or "20l" in inc
    return True

def clean_str(s):
    return str(s).replace('\u2713', '[PASS]').replace('\u2717', '[FAIL]')

def audit_viewer(viewer_id):
    try:
        viewer = MatrimonyProfile.objects.get(id=viewer_id)
    except MatrimonyProfile.DoesNotExist:
        print(f"Profile with ID {viewer_id} does not exist.")
        return

    print("=" * 80)
    print(f"AUDITING RECOMMENDATIONS FOR VIEWER: {viewer.name} (ID: {viewer.id})")
    print(f"Gender: {viewer.gender} | Caste: {viewer.caste} | Community: {viewer.community.name if viewer.community else 'None'}")
    print("=" * 80)

    # STEP 1: Profiles loaded from database
    print("\nSTEP 1")
    print("Profiles loaded from database")
    raw_profiles = MatrimonyProfile.objects.all()
    print(f"Loaded {raw_profiles.count()} profiles")
    print(f"IDs: {list(raw_profiles.values_list('id', flat=True))}")

    # STEP 2: Profiles removed
    print("\nSTEP 2")
    print("Profiles removed")

    removed_profiles = []

    # Let's trace each exclusion stage
    # Stage 1: Basic database filter (approved status, deleted_at, self-exclude)
    survived_stage1 = []
    for p in raw_profiles:
        if p.id == viewer.id:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": "Self profile excluded",
                "file": "api/views.py",
                "function": "matches",
                "line": 4659
            })
            continue

        if p.deleted_at is not None:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Deleted profile (deleted_at={p.deleted_at})",
                "file": "api/views.py",
                "function": "matches",
                "line": 4658
            })
            continue

        if p.status not in ['Approved', 'Active', 'Featured']:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Status is '{p.status}' (not Approved, Active, or Featured)",
                "file": "api/views.py",
                "function": "matches",
                "line": 4657
            })
            continue

        survived_stage1.append(p)

    # Stage 2: Database-level PreferenceEngine.applyMandatoryFilters
    pref = PartnerPreference.objects.filter(profile=viewer).first()
    survived_stage2 = []
    
    # We simulate applyMandatoryFilters logic manually for each candidate to get precise reason
    for p in survived_stage1:
        if not pref:
            survived_stage2.append(p)
            continue

        # Gender check
        pref_gender = pref.gender
        gender_failed = False
        if pref_gender and pref_gender != 'Everyone' and pref_gender != 'All':
            norm_pref = pref_gender.strip().lower()
            cand_gender = (p.gender or '').strip().lower()
            if norm_pref in ('bride', 'female', 'bride profiles', 'female only'):
                if cand_gender not in ('female', 'bride'):
                    gender_failed = True
            elif norm_pref in ('groom', 'male', 'groom profiles', 'male only'):
                if cand_gender not in ('male', 'groom'):
                    gender_failed = True
        
        if gender_failed:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Gender looking for '{pref_gender}' but candidate is '{p.gender}'",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 84
            })
            continue

        # Age Min check
        if pref.min_age is not None and pref.min_age > 0 and p.age < pref.min_age:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Age {p.age} is below min age {pref.min_age}",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 91
            })
            continue

        # Age Max check
        if pref.max_age is not None and pref.max_age > 0 and p.age > pref.max_age:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Age {p.age} is above max age {pref.max_age}",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 94
            })
            continue

        # Marital Status check
        pref_ms = (pref.marital_status or '').strip().lower()
        ms_failed = False
        if pref_ms and pref_ms != 'any' and pref_ms != '':
            allowed_statuses = [x.strip().lower() for x in pref.marital_status.split(',') if x.strip()]
            cand_ms = (p.marital_status or '').strip().lower()
            if allowed_statuses and cand_ms not in allowed_statuses:
                ms_failed = True
        
        if ms_failed:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Marital status '{p.marital_status}' not in allowed list '{pref.marital_status}'",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 104
            })
            continue

        # Preferred Communities check
        pref_comms_str = getattr(pref, 'preferred_communities', '')
        comm_failed = False
        if pref_comms_str:
            try:
                allowed_ids = [int(x.strip()) for x in pref_comms_str.split(',') if x.strip().isdigit()]
                if allowed_ids and p.community_id not in allowed_ids and p.visibility_type not in ['PLATFORM_WIDE', 'OPEN TO ALL']:
                    comm_failed = True
            except ValueError:
                pass
        
        if comm_failed:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Community ID {p.community_id} not in allowed list '{pref_comms_str}' and candidate is not PLATFORM_WIDE",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 112
            })
            continue

        # Caste check
        pref_caste = (pref.caste or '').strip()
        caste_failed = False
        if pref_caste and pref_caste.lower() != 'any':
            if pref_caste.lower() not in (p.caste or '').lower():
                caste_failed = True
        
        if caste_failed:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": f"Preference mismatch: Caste '{p.caste}' does not contain preferred caste '{pref_caste}'",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 119
            })
            continue

        # Blocked check
        blocked_user_ids = list(BlockedUser.objects.filter(user=viewer.user).values_list('blocked_user_id', flat=True))
        blocked_by_ids = list(BlockedUser.objects.filter(blocked_user=viewer.user).values_list('user_id', flat=True))
        all_blocked_user_ids = set(blocked_user_ids + blocked_by_ids)
        if p.user_id in all_blocked_user_ids:
            removed_profiles.append({
                "id": p.id,
                "name": p.name,
                "reason": "Blocked user list exclusion",
                "file": "api/preference_engine.py",
                "function": "applyMandatoryFilters",
                "line": 126
            })
            continue

        survived_stage2.append(p)

    # Stage 3: Python-level Loop check `isRecommendationEligible`
    survived_stage3 = []
    for p in survived_stage2:
        # Check isRecommendationEligible (which runs canViewProfile, check_blocked, check_mandatory_filters, reciprocal check_mandatory_filters)
        is_eligible = MatrimonyRuleEngine.isRecommendationEligible(p, viewer)
        if not is_eligible:
            # Let's find why it failed
            # 1. canViewProfile check
            if not MatrimonyRuleEngine.canViewProfile(p, viewer.user):
                removed_profiles.append({
                    "id": p.id,
                    "name": p.name,
                    "reason": "Visibility engine check failed (canViewProfile is False)",
                    "file": "api/rule_engine.py",
                    "function": "isRecommendationEligible",
                    "line": 639
                })
                continue
            # 2. Block check
            if MatrimonyRuleEngine.check_blocked(viewer, p):
                removed_profiles.append({
                    "id": p.id,
                    "name": p.name,
                    "reason": "Blocked user check failed",
                    "file": "api/rule_engine.py",
                    "function": "isRecommendationEligible",
                    "line": 643
                })
                continue
            # 3. check_mandatory_filters (viewer's prefs on candidate)
            match_viewer, reason_v = MatrimonyRuleEngine.check_mandatory_filters(viewer, p)
            if not match_viewer:
                removed_profiles.append({
                    "id": p.id,
                    "name": p.name,
                    "reason": f"Mandatory filter failed: {clean_str(reason_v)}",
                    "file": "api/rule_engine.py",
                    "function": "isRecommendationEligible",
                    "line": 647
                })
                continue
            # 4. Reciprocal check_mandatory_filters (candidate's prefs on viewer)
            match_candidate, reason_c = MatrimonyRuleEngine.check_mandatory_filters(p, viewer)
            if not match_candidate:
                removed_profiles.append({
                    "id": p.id,
                    "name": p.name,
                    "reason": f"Reciprocal mandatory filter failed: {clean_str(reason_c)}",
                    "file": "api/rule_engine.py",
                    "function": "isRecommendationEligible",
                    "line": 656
                })
                continue
        survived_stage3.append(p)

    for rm in removed_profiles:
        print(f"Profile ID: {rm['id']}")
        print(f"Profile Name: {rm['name']}")
        print(f"Reason: {rm['reason']}")
        print(f"Backend file: {rm['file']}")
        print(f"Function name: {rm['function']}")
        print(f"Line number: {rm['line']}")
        print("-" * 30)

    # STEP 3: Remaining profiles
    print("\nSTEP 3")
    print("Remaining profiles")
    print(f"IDs: {[p.id for p in survived_stage3]}")

    # STEP 4: Visibility Engine Result
    print("\nSTEP 4")
    print("Visibility Engine Result")
    for p in survived_stage3:
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(p, viewer.user)
        print(f"Profile ID {p.id} ({p.name}): {'Visible' if visible else 'Hidden'} | Reason: {reason}")

    # STEP 5: Preference Engine
    print("\nSTEP 5")
    print("Preference Engine")
    for p in survived_stage3:
        print(f"Profile ID {p.id} ({p.name}):")
        
        # Verify check_mandatory_filters fields
        if not pref:
            print("  No Partner Preference defined for viewer")
            continue
            
        # Age check
        min_age = pref.min_age
        max_age = pref.max_age
        age_passed = True
        if min_age is not None and min_age > 0 and p.age < min_age:
            age_passed = False
        if max_age is not None and max_age > 0 and p.age > max_age:
            age_passed = False
        print(f"  Age (Range {min_age}-{max_age} vs {p.age}): {'Passed' if age_passed else 'Failed'}")
        
        # Height check
        min_h = pref.min_height
        max_h = pref.max_height
        height_passed = True
        cand_inches = parse_h_to_inches(p.height)
        if min_h:
            min_inches = parse_h_to_inches(min_h)
            if min_inches > 0 and cand_inches < min_inches:
                height_passed = False
        if max_h:
            max_inches = parse_h_to_inches(max_h)
            if max_inches > 0 and cand_inches > max_inches:
                height_passed = False
        print(f"  Height (Range {min_h}-{max_h} vs {p.height}): {'Passed' if height_passed else 'Failed'}")
        
        # Community check
        pref_comms_str = getattr(pref, 'preferred_communities', '')
        comm_passed = True
        if pref_comms_str and p.visibility_type not in ('PLATFORM_WIDE', 'OPEN TO ALL'):
            try:
                allowed_ids = [int(x.strip()) for x in pref_comms_str.split(',') if x.strip()]
                if allowed_ids and p.community_id not in allowed_ids:
                    comm_passed = False
            except ValueError:
                pass
        print(f"  Community (Pref '{pref_comms_str}' vs ID {p.community_id}): {'Passed' if comm_passed else 'Failed'}")

        # Religion check
        pref_rel = getattr(pref, 'religion', '').strip().lower()
        cand_rel = getattr(p, 'religion', '').strip().lower()
        rel_passed = True
        if pref_rel and pref_rel != 'any' and pref_rel != '':
            if pref_rel != cand_rel:
                rel_passed = False
        print(f"  Religion (Pref '{pref.religion}' vs '{p.religion}'): {'Passed' if rel_passed else 'Failed'}")

        # Education check
        pref_edu = getattr(pref, 'education', '').strip().lower()
        cand_edu = getattr(p, 'education', '').strip().lower()
        edu_passed = True
        if pref_edu and pref_edu != 'any' and pref_edu != '':
            if pref_edu not in cand_edu and cand_edu not in pref_edu:
                edu_passed = False
        print(f"  Education (Pref '{pref.education}' vs '{p.education}'): {'Passed' if edu_passed else 'Failed'}")

        # Occupation check
        pref_occ = getattr(pref, 'occupation', '').strip().lower()
        cand_occ = getattr(p, 'profession', '').strip().lower()
        occ_passed = True
        if pref_occ and pref_occ != 'any' and pref_occ != '':
            if pref_occ not in cand_occ and cand_occ not in pref_occ:
                occ_passed = False
        print(f"  Occupation (Pref '{pref.occupation}' vs '{p.profession}'): {'Passed' if occ_passed else 'Failed'}")

        # Income check
        pref_inc = getattr(pref, 'income_range', '').strip().lower()
        inc_passed = True
        if pref_inc and pref_inc != 'any' and pref_inc != '':
            if not check_inc_range(p.income, pref_inc):
                inc_passed = False
        print(f"  Income (Pref '{pref.income_range}' vs '{p.income}'): {'Passed' if inc_passed else 'Failed'}")

        # Language check
        pref_lang = getattr(pref, 'mother_tongue', '').strip().lower()
        cand_lang = getattr(p, 'mother_tongue', '').strip().lower()
        lang_passed = True
        if pref_lang and pref_lang != 'any' and pref_lang != '':
            if pref_lang not in cand_lang and cand_lang not in pref_lang:
                lang_passed = False
        print(f"  Language (Pref '{pref.mother_tongue}' vs '{p.mother_tongue}'): {'Passed' if lang_passed else 'Failed'}")

        # Lifestyle check
        pref_diet = getattr(pref, 'diet', '').strip().lower()
        cand_diet = getattr(p, 'diet', '').strip().lower()
        diet_passed = True
        if pref_diet and pref_diet != 'any' and pref_diet != '':
            if pref_diet != cand_diet:
                diet_passed = False
        print(f"  Lifestyle - Diet (Pref '{pref.diet}' vs '{p.diet}'): {'Passed' if diet_passed else 'Failed'}")

    # STEP 6: Recommendation Score
    print("\nSTEP 6")
    print("Recommendation Score")
    for p in survived_stage3:
        res = MatrimonyRuleEngine.calculateMatchScore(viewer, p)
        print(f"Profile ID {p.id} ({p.name}):")
        print(f"  Score: {res['score']}%")
        print(f"  Breakdown: {res['breakdown']}")
        print(f"  Reasons: {[clean_str(r) for r in res['reasons']]}")
        print(f"  Negatives: {[clean_str(n) for n in res['negatives']]}")
        print(f"  Formula: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).")
        print(f"  Why: {', '.join([clean_str(r) for r in res['reasons']]) if res['reasons'] else 'None'}")

    # STEP 7: Serializer
    print("\nSTEP 7")
    print("Serializer")
    # Simulate MatrimonyProfileSerializer.to_representation and look for filter/removals
    # Does any profile return None or get filtered out?
    serializer_removed = []
    for p in survived_stage3:
        # Check serializeVisibleFields
        data = MatrimonyProfileSerializer(p, context={'request': None}).data
        if data is None or not data:
            print(f"Profile ID {p.id} ({p.name}) REMOVED by Serializer")
            serializer_removed.append(p)
        else:
            print(f"Profile ID {p.id} ({p.name}) processed by Serializer successfully (id={data.get('id')})")
            
    if not serializer_removed:
        print("No profiles were removed by the serializer.")

    # STEP 8: Final API response
    print("\nSTEP 8")
    print("Final API response")
    expected_count = len(survived_stage3)
    actual_count = len(survived_stage3) - len(serializer_removed)
    print(f"Expected count: {expected_count}")
    print(f"Actual count: {actual_count}")
    if expected_count != actual_count:
        print("Mismatch explanation: Some profiles were removed by serializer check or to_representation filters.")
    else:
        print("Mismatch explanation: None. Counts match.")

# Run audit for priyanshi (ID: 23)
audit_viewer(23)
