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

def run_audit(viewer_id, target_file_path):
    try:
        viewer = MatrimonyProfile.objects.get(id=viewer_id)
    except MatrimonyProfile.DoesNotExist:
        print(f"Profile {viewer_id} does not exist.")
        return

    pref = PartnerPreference.objects.filter(profile=viewer).first()

    lines = []
    lines.append(f"# MATRIMONY RECOMMENDATION ENGINE AUDIT REPORT")
    lines.append(f"**Audited Viewer**: {viewer.name} (ID: {viewer.id})")
    lines.append(f"**Gender**: {viewer.gender} | **Community**: {viewer.community.name if viewer.community else 'None'} | **Caste**: {viewer.caste}")
    lines.append(f"**Status**: {viewer.status} | **Is Verified**: {viewer.is_verified}")
    lines.append("")

    # STEP 1: Profiles loaded from database
    raw_profiles = MatrimonyProfile.objects.all()
    lines.append("## STEP 1: Profiles loaded from database")
    lines.append(f"Loaded {raw_profiles.count()} profiles")
    lines.append(f"IDs: {list(raw_profiles.values_list('id', flat=True))}")
    lines.append("")

    # STEP 2: Profiles removed
    lines.append("## STEP 2: Profiles removed")
    
    removed_profiles = []
    survived_stage1 = []
    for p in raw_profiles:
        if p.id == viewer.id:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": "Self profile excluded",
                "file": "api/views.py", "function": "matches", "line": 4659
            })
            continue
        if p.deleted_at is not None:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Deleted profile (deleted_at={p.deleted_at})",
                "file": "api/views.py", "function": "matches", "line": 4658
            })
            continue
        if p.status not in ['Approved', 'Active', 'Featured']:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Status is '{p.status}' (not Approved, Active, or Featured)",
                "file": "api/views.py", "function": "matches", "line": 4657
            })
            continue
        survived_stage1.append(p)

    # PreferenceEngine SQL level
    survived_stage2 = []
    for p in survived_stage1:
        if not pref:
            survived_stage2.append(p)
            continue

        # Gender
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
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Gender looking for '{pref_gender}' but candidate is '{p.gender}'",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 84
            })
            continue

        # Age Min
        if pref.min_age is not None and pref.min_age > 0 and p.age < pref.min_age:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Age {p.age} is below min age {pref.min_age}",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 91
            })
            continue

        # Age Max
        if pref.max_age is not None and pref.max_age > 0 and p.age > pref.max_age:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Age {p.age} is above max age {pref.max_age}",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 94
            })
            continue

        # Marital Status
        pref_ms = (pref.marital_status or '').strip().lower()
        ms_failed = False
        if pref_ms and pref_ms != 'any' and pref_ms != '':
            allowed_statuses = [x.strip().lower() for x in pref.marital_status.split(',') if x.strip()]
            cand_ms = (p.marital_status or '').strip().lower()
            if allowed_statuses and cand_ms not in allowed_statuses:
                ms_failed = True
        if ms_failed:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Marital status '{p.marital_status}' not in allowed list '{pref.marital_status}'",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 104
            })
            continue

        # Preferred Communities
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
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Community ID {p.community_id} not in allowed list '{pref_comms_str}' and candidate is not PLATFORM_WIDE",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 112
            })
            continue

        # Caste
        pref_caste = (pref.caste or '').strip()
        caste_failed = False
        if pref_caste and pref_caste.lower() != 'any':
            if pref_caste.lower() not in (p.caste or '').lower():
                caste_failed = True
        if caste_failed:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": f"Preference Mismatch: Caste '{p.caste}' does not contain preferred caste '{pref_caste}'",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 119
            })
            continue

        # Blocked
        blocked_user_ids = list(BlockedUser.objects.filter(user=viewer.user).values_list('blocked_user_id', flat=True))
        blocked_by_ids = list(BlockedUser.objects.filter(blocked_user=viewer.user).values_list('user_id', flat=True))
        all_blocked_user_ids = set(blocked_user_ids + blocked_by_ids)
        if p.user_id in all_blocked_user_ids:
            removed_profiles.append({
                "id": p.id, "name": p.name, "reason": "Blocked user list exclusion",
                "file": "api/preference_engine.py", "function": "applyMandatoryFilters", "line": 126
            })
            continue

        survived_stage2.append(p)

    # Python-level eligibility check
    survived_stage3 = []
    for p in survived_stage2:
        is_eligible = MatrimonyRuleEngine.isRecommendationEligible(p, viewer)
        if not is_eligible:
            if not MatrimonyRuleEngine.canViewProfile(p, viewer.user):
                removed_profiles.append({
                    "id": p.id, "name": p.name, "reason": "Visibility engine check failed (canViewProfile is False)",
                    "file": "api/rule_engine.py", "function": "isRecommendationEligible", "line": 639
                })
                continue
            if MatrimonyRuleEngine.check_blocked(viewer, p):
                removed_profiles.append({
                    "id": p.id, "name": p.name, "reason": "Blocked user check failed",
                    "file": "api/rule_engine.py", "function": "isRecommendationEligible", "line": 643
                })
                continue
            match_viewer, reason_v = MatrimonyRuleEngine.check_mandatory_filters(viewer, p)
            if not match_viewer:
                removed_profiles.append({
                    "id": p.id, "name": p.name, "reason": f"Mandatory filter failed: {reason_v}",
                    "file": "api/rule_engine.py", "function": "isRecommendationEligible", "line": 647
                })
                continue
            match_candidate, reason_c = MatrimonyRuleEngine.check_mandatory_filters(p, viewer)
            if not match_candidate:
                removed_profiles.append({
                    "id": p.id, "name": p.name, "reason": f"Reciprocal mandatory filter failed: {reason_c}",
                    "file": "api/rule_engine.py", "function": "isRecommendationEligible", "line": 656
                })
                continue
        survived_stage3.append(p)

    for rm in removed_profiles:
        lines.append(f"- **Profile ID**: {rm['id']}  ")
        lines.append(f"  **Profile Name**: {rm['name']}  ")
        lines.append(f"  **Reason**: {rm['reason']}  ")
        lines.append(f"  **Backend file**: `{rm['file']}`  ")
        lines.append(f"  **Function name**: `{rm['function']}`  ")
        lines.append(f"  **Line number**: {rm['line']}  ")
        lines.append("")

    # STEP 3: Remaining profiles
    lines.append("## STEP 3: Remaining profiles")
    lines.append(f"IDs: {[p.id for p in survived_stage3]}")
    lines.append("")

    # STEP 4: Visibility Engine Result
    lines.append("## STEP 4: Visibility Engine Result")
    for p in survived_stage3:
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(p, viewer.user)
        lines.append(f"- **Profile ID {p.id} ({p.name})**: {'[PASS] Visible' if visible else '[FAIL] Hidden'} | Reason: {reason}")
    lines.append("")

    # STEP 5: Preference Engine
    lines.append("## STEP 5: Preference Engine")
    for p in survived_stage3:
        lines.append(f"### Profile ID {p.id} ({p.name}):")
        if not pref:
            lines.append("- No partner preference defined.")
            continue
        
        # Age
        age_passed = True
        if pref.min_age is not None and pref.min_age > 0 and p.age < pref.min_age: age_passed = False
        if pref.max_age is not None and pref.max_age > 0 and p.age > pref.max_age: age_passed = False
        lines.append(f"- **Age** (Pref {pref.min_age}-{pref.max_age} vs {p.age}): {'[PASS]' if age_passed else '[FAIL]'}")

        # Height
        min_h = pref.min_height
        max_h = pref.max_height
        height_passed = True
        cand_inches = parse_h_to_inches(p.height)
        if min_h:
            min_inches = parse_h_to_inches(min_h)
            if min_inches > 0 and cand_inches < min_inches: height_passed = False
        if max_h:
            max_inches = parse_h_to_inches(max_h)
            if max_inches > 0 and cand_inches > max_inches: height_passed = False
        lines.append(f"- **Height** (Pref {min_h}-{max_h} vs {p.height}): {'[PASS]' if height_passed else '[FAIL]'}")

        # Community
        pref_comms_str = getattr(pref, 'preferred_communities', '')
        comm_passed = True
        if pref_comms_str and p.visibility_type not in ('PLATFORM_WIDE', 'OPEN TO ALL'):
            try:
                allowed_ids = [int(x.strip()) for x in pref_comms_str.split(',') if x.strip()]
                if allowed_ids and p.community_id not in allowed_ids: comm_passed = False
            except ValueError:
                pass
        lines.append(f"- **Community** (Pref {pref_comms_str} vs ID {p.community_id}): {'[PASS]' if comm_passed else '[FAIL]'}")

        # Religion
        pref_rel = getattr(pref, 'religion', '').strip().lower()
        cand_rel = getattr(p, 'religion', '').strip().lower()
        rel_passed = True
        if pref_rel and pref_rel != 'any' and pref_rel != '':
            if pref_rel != cand_rel: rel_passed = False
        lines.append(f"- **Religion** (Pref {pref.religion} vs {p.religion}): {'[PASS]' if rel_passed else '[FAIL]'}")

        # Education
        pref_edu = getattr(pref, 'education', '').strip().lower()
        cand_edu = getattr(p, 'education', '').strip().lower()
        edu_passed = True
        if pref_edu and pref_edu != 'any' and pref_edu != '':
            if pref_edu not in cand_edu and cand_edu not in pref_edu: edu_passed = False
        lines.append(f"- **Education** (Pref {pref.education} vs {p.education}): {'[PASS]' if edu_passed else '[FAIL]'}")

        # Occupation
        pref_occ = getattr(pref, 'occupation', '').strip().lower()
        cand_occ = getattr(p, 'profession', '').strip().lower()
        occ_passed = True
        if pref_occ and pref_occ != 'any' and pref_occ != '':
            if pref_occ not in cand_occ and cand_occ not in pref_occ: occ_passed = False
        lines.append(f"- **Occupation** (Pref {pref.occupation} vs {p.profession}): {'[PASS]' if occ_passed else '[FAIL]'}")

        # Income
        pref_inc = getattr(pref, 'income_range', '').strip().lower()
        inc_passed = True
        if pref_inc and pref_inc != 'any' and pref_inc != '':
            if not check_inc_range(p.income, pref_inc): inc_passed = False
        lines.append(f"- **Income** (Pref {pref.income_range} vs {p.income}): {'[PASS]' if inc_passed else '[FAIL]'}")

        # Language
        pref_lang = getattr(pref, 'mother_tongue', '').strip().lower()
        cand_lang = getattr(p, 'mother_tongue', '').strip().lower()
        lang_passed = True
        if pref_lang and pref_lang != 'any' and pref_lang != '':
            if pref_lang not in cand_lang and cand_lang not in pref_lang: lang_passed = False
        lines.append(f"- **Language** (Pref {pref.mother_tongue} vs {p.mother_tongue}): {'[PASS]' if lang_passed else '[FAIL]'}")

        # Lifestyle
        pref_diet = getattr(pref, 'diet', '').strip().lower()
        cand_diet = getattr(p, 'diet', '').strip().lower()
        diet_passed = True
        if pref_diet and pref_diet != 'any' and pref_diet != '':
            if pref_diet != cand_diet: diet_passed = False
        lines.append(f"- **Lifestyle - Diet** (Pref {pref.diet} vs {p.diet}): {'[PASS]' if diet_passed else '[FAIL]'}")
        lines.append("")

    # STEP 6: Recommendation Score
    lines.append("## STEP 6: Recommendation Score")
    for p in survived_stage3:
        res = MatrimonyRuleEngine.calculateMatchScore(viewer, p)
        lines.append(f"### Profile ID {p.id} ({p.name}):")
        lines.append(f"- **Score**: {res['score']}%")
        lines.append(f"- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).")
        lines.append(f"- **Why**: {', '.join([str(r).replace('[PASS]', '').strip() for r in res['reasons']]) if res['reasons'] else 'None'}")
        lines.append("")

    # STEP 7: Serializer
    lines.append("## STEP 7: Serializer")
    serializer_removed = []
    for p in survived_stage3:
        data = MatrimonyProfileSerializer(p, context={'request': None}).data
        if data is None or not data:
            lines.append(f"- **Profile ID {p.id} ({p.name})**: REMOVED by Serializer")
            serializer_removed.append(p)
        else:
            lines.append(f"- **Profile ID {p.id} ({p.name})**: processed by Serializer successfully (id={data.get('id')})")
    if not serializer_removed:
        lines.append("No profiles were removed by the serializer.")
    lines.append("")

    # STEP 8: Final API response
    lines.append("## STEP 8: Final API response")
    expected_count = len(survived_stage3)
    actual_count = len(survived_stage3) - len(serializer_removed)
    lines.append(f"- **Expected count**: {expected_count}")
    lines.append(f"- **Actual count**: {actual_count}")
    
    # Let's write the core explanation here
    lines.append("")
    lines.append("## AUDIT ANALYSIS & EXPLANATION OF ISSUES")
    lines.append("Active, approved, completed, \"Open To All\" profiles (like priyanshi, ID 23) do NOT appear in Recommended Matches or Search Results for certain users/contexts due to these backend issues:")
    lines.append("1. **SQL-Level Caste Filter Exclusion in applyMandatoryFilters**:")
    lines.append("   - In `api/preference_engine.py` line 72, `applyMandatoryFilters` filters queryset results by looking at the viewer's caste preference:")
    lines.append("     `queryset = queryset.filter(caste__icontains=pref_caste)`")
    lines.append("   - This filter is applied at the database (SQL) level. However, unlike the Community filter which has a bypass logic for Open To All profiles:")
    lines.append("     `queryset = queryset.filter(Q(community_id__in=allowed_ids) | Q(visibility_type__in=['PLATFORM_WIDE', 'OPEN TO ALL']))`")
    lines.append("   - The Caste filter has NO such bypass. Thus, any candidate profile whose caste does not match the viewer's caste preference is filtered out, even if their privacy mode is \"Open To All\" (`PLATFORM_WIDE`).")
    lines.append("2. **Python-Level Filter Exclusions in check_mandatory_filters**:")
    lines.append("   - In `api/rule_engine.py` line 100, `check_mandatory_filters` applies validation checks for several fields like Caste, Sub-Caste, State, City, Education, Occupation, and Height.")
    lines.append("   - While the Community check explicitly bypasses Open To All profiles:")
    lines.append("     `if pref_communities_str and candidate.visibility_type not in ('PLATFORM_WIDE', 'OPEN TO ALL'):`")
    lines.append("   - None of the other fields (Caste, Sub-Caste, State, City, Education, Occupation) have bypasses for Open To All profiles. Therefore, if a viewer has any of these preferences set, any Open To All profile that fails to match them is excluded.")
    lines.append("3. **Strict filter_by_community Application in get_queryset**:")
    lines.append("   - In `api/views.py` line 2647, if a query parameter `community_id` is passed, `filter_by_community` is run:")
    lines.append("     `queryset = filter_by_community(queryset, community_id)`")
    lines.append("   - This strictly restricts profiles to the queried community and has no bypass logic for platform-wide/Open To All profiles. Since the frontend dashboard might filter profiles within specific communities, Open To All profiles belonging to other communities are completely filtered out.")
    lines.append("4. **Viewer Profile Verification/Approval Lockout**:")
    lines.append("   - In `api/views.py` line 2513, if the current logged-in viewer does not have an approved and verified profile in the database, they are restricted to seeing ONLY their own profile:")
    lines.append("     `return queryset.filter(user=user).order_by('-id')`")
    lines.append("   - This means new or unverified users cannot see any matches or Open To All profiles whatsoever on their dashboard or search results.")
    lines.append("")

    with open(target_file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Report generated successfully at {target_file_path}")

# Run audit report generation
run_audit(5, 'scratch/matrimony_audit_report.md')
