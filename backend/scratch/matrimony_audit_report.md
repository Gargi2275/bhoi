# MATRIMONY RECOMMENDATION ENGINE AUDIT REPORT
**Audited Viewer**: member2 (ID: 5)
**Gender**: Groom | **Community**: Surat community | **Caste**: Ahir
**Status**: Active | **Is Verified**: True

## STEP 1: Profiles loaded from database
Loaded 24 profiles
IDs: [56, 1, 4, 5, 22, 23, 2, 6, 21, 41, 46, 51, 52, 53, 54, 55, 57, 58, 59, 60, 47, 40, 50, 3]

## STEP 2: Profiles removed
- **Profile ID**: 5  
  **Profile Name**: member2  
  **Reason**: Self profile excluded  
  **Backend file**: `api/views.py`  
  **Function name**: `matches`  
  **Line number**: 4659  

- **Profile ID**: 1  
  **Profile Name**: aryan jinjala  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 3  
  **Profile Name**: Rutvika Jinjala  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 4  
  **Profile Name**: member  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 6  
  **Profile Name**: member3  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 40  
  **Profile Name**: Male Sc1  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Male'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 47  
  **Profile Name**: Viewer  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Male'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 50  
  **Profile Name**: Male  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Male'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 53  
  **Profile Name**: bmember  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 56  
  **Profile Name**: User B  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Male'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 57  
  **Profile Name**: Test Member  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 58  
  **Profile Name**: Test Member  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 59  
  **Profile Name**: Test Member  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 60  
  **Profile Name**: Profile Updated  
  **Reason**: Preference Mismatch: Gender looking for 'Bride' but candidate is 'Groom'  
  **Backend file**: `api/preference_engine.py`  
  **Function name**: `applyMandatoryFilters`  
  **Line number**: 84  

- **Profile ID**: 2  
  **Profile Name**: dixita  
  **Reason**: Visibility engine check failed (canViewProfile is False)  
  **Backend file**: `api/rule_engine.py`  
  **Function name**: `isRecommendationEligible`  
  **Line number**: 639  

- **Profile ID**: 21  
  **Profile Name**: Harshil Shah  
  **Reason**: Visibility engine check failed (canViewProfile is False)  
  **Backend file**: `api/rule_engine.py`  
  **Function name**: `isRecommendationEligible`  
  **Line number**: 639  

- **Profile ID**: 41  
  **Profile Name**: Female Sc1  
  **Reason**: Visibility engine check failed (canViewProfile is False)  
  **Backend file**: `api/rule_engine.py`  
  **Function name**: `isRecommendationEligible`  
  **Line number**: 639  

- **Profile ID**: 46  
  **Profile Name**: Candidate Private  
  **Reason**: Visibility engine check failed (canViewProfile is False)  
  **Backend file**: `api/rule_engine.py`  
  **Function name**: `isRecommendationEligible`  
  **Line number**: 639  

- **Profile ID**: 51  
  **Profile Name**: Female  
  **Reason**: Visibility engine check failed (canViewProfile is False)  
  **Backend file**: `api/rule_engine.py`  
  **Function name**: `isRecommendationEligible`  
  **Line number**: 639  

## STEP 3: Remaining profiles
IDs: [22, 23, 52, 54, 55]

## STEP 4: Visibility Engine Result
- **Profile ID 22 (test)**: [PASS] Visible | Reason: Open To All
- **Profile ID 23 (priyanshi)**: [PASS] Visible | Reason: Open To All
- **Profile ID 52 (testm)**: [PASS] Visible | Reason: Open To All
- **Profile ID 54 (member 4)**: [PASS] Visible | Reason: Open To All
- **Profile ID 55 (Profile A)**: [PASS] Visible | Reason: Open To All

## STEP 5: Preference Engine
### Profile ID 22 (test):
- **Age** (Pref 18-60 vs 22): [PASS]
- **Height** (Pref - vs 5'9): [PASS]
- **Community** (Pref  vs ID 25): [PASS]
- **Religion** (Pref  vs Hindu): [PASS]
- **Education** (Pref  vs asd): [PASS]
- **Occupation** (Pref  vs asd): [PASS]
- **Income** (Pref  vs asd): [PASS]
- **Language** (Pref  vs Gujarati): [PASS]
- **Lifestyle - Diet** (Pref  vs Vegetarian): [PASS]

### Profile ID 23 (priyanshi):
- **Age** (Pref 18-60 vs 23): [PASS]
- **Height** (Pref - vs tg5): [PASS]
- **Community** (Pref  vs ID 18): [PASS]
- **Religion** (Pref  vs Hindu): [PASS]
- **Education** (Pref  vs ): [PASS]
- **Occupation** (Pref  vs teacher): [PASS]
- **Income** (Pref  vs ): [PASS]
- **Language** (Pref  vs Gujarati): [PASS]
- **Lifestyle - Diet** (Pref  vs Vegetarian): [PASS]

### Profile ID 52 (testm):
- **Age** (Pref 18-60 vs 25): [PASS]
- **Height** (Pref - vs 5'9): [PASS]
- **Community** (Pref  vs ID 20): [PASS]
- **Religion** (Pref  vs Hindu): [PASS]
- **Education** (Pref  vs bca): [PASS]
- **Occupation** (Pref  vs sd): [PASS]
- **Income** (Pref  vs 5): [PASS]
- **Language** (Pref  vs Gujarati): [PASS]
- **Lifestyle - Diet** (Pref  vs Vegetarian): [PASS]

### Profile ID 54 (member 4):
- **Age** (Pref 18-60 vs 25): [PASS]
- **Height** (Pref - vs 5): [PASS]
- **Community** (Pref  vs ID 19): [PASS]
- **Religion** (Pref  vs Hindu): [PASS]
- **Education** (Pref  vs ff): [PASS]
- **Occupation** (Pref  vs e): [PASS]
- **Income** (Pref  vs ): [PASS]
- **Language** (Pref  vs Gujarati): [PASS]
- **Lifestyle - Diet** (Pref  vs Vegetarian): [PASS]

### Profile ID 55 (Profile A):
- **Age** (Pref 18-60 vs 25): [PASS]
- **Height** (Pref - vs ): [PASS]
- **Community** (Pref  vs ID 49): [PASS]
- **Religion** (Pref  vs Hindu): [PASS]
- **Education** (Pref  vs ): [PASS]
- **Occupation** (Pref  vs ): [PASS]
- **Income** (Pref  vs ): [PASS]
- **Language** (Pref  vs ): [PASS]
- **Lifestyle - Diet** (Pref  vs Vegetarian): [PASS]

## STEP 6: Recommendation Score
### Profile ID 22 (test):
- **Score**: 95%
- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).
- **Why**: ✓ Age matched preferred range, ✓ Different community within hierarchy, ✓ Caste accepted (Any), ✓ Marital status accepted (Any), ✓ Education level accepted (Any), ✓ Occupation accepted (Any), ✓ Exact location matched, ✓ Diet preference matched, ✓ Smoking preference matched, ✓ Drinking preference matched, ✓ Religion matched, ✓ Income range matched

### Profile ID 23 (priyanshi):
- **Score**: 95%
- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).
- **Why**: ✓ Age matched preferred range, ✓ Different community within hierarchy, ✓ Caste accepted (Any), ✓ Marital status accepted (Any), ✓ Education level accepted (Any), ✓ Occupation accepted (Any), ✓ Exact location matched, ✓ Diet preference matched, ✓ Smoking preference matched, ✓ Drinking preference matched, ✓ Religion matched, ✓ Income range matched

### Profile ID 52 (testm):
- **Score**: 95%
- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).
- **Why**: ✓ Age matched preferred range, ✓ Different community within hierarchy, ✓ Caste accepted (Any), ✓ Marital status accepted (Any), ✓ Education level accepted (Any), ✓ Occupation accepted (Any), ✓ Exact location matched, ✓ Diet preference matched, ✓ Smoking preference matched, ✓ Drinking preference matched, ✓ Religion matched, ✓ Income range matched

### Profile ID 54 (member 4):
- **Score**: 100%
- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).
- **Why**: ✓ Age matched preferred range, ✓ Same community matched, ✓ Caste accepted (Any), ✓ Marital status accepted (Any), ✓ Education level accepted (Any), ✓ Occupation accepted (Any), ✓ Exact location matched, ✓ Diet preference matched, ✓ Smoking preference matched, ✓ Drinking preference matched, ✓ Religion matched, ✓ Income range matched

### Profile ID 55 (Profile A):
- **Score**: 95%
- **Formula**: Sum of category weights (Age: 20, Community/Caste: 20, Marital Status: 10, Education: 10, Occupation: 10, Location: 10, Lifestyle: 10, Religion: 5, Income: 5) with verified/photo deductions (-15 each).
- **Why**: ✓ Age matched preferred range, ✓ Different community within hierarchy, ✓ Caste accepted (Any), ✓ Marital status accepted (Any), ✓ Education level accepted (Any), ✓ Occupation accepted (Any), ✓ Exact location matched, ✓ Diet preference matched, ✓ Smoking preference matched, ✓ Drinking preference matched, ✓ Religion matched, ✓ Income range matched

## STEP 7: Serializer
- **Profile ID 22 (test)**: processed by Serializer successfully (id=22)
- **Profile ID 23 (priyanshi)**: processed by Serializer successfully (id=23)
- **Profile ID 52 (testm)**: processed by Serializer successfully (id=52)
- **Profile ID 54 (member 4)**: processed by Serializer successfully (id=54)
- **Profile ID 55 (Profile A)**: processed by Serializer successfully (id=55)
No profiles were removed by the serializer.

## STEP 8: Final API response
- **Expected count**: 5
- **Actual count**: 5

## AUDIT ANALYSIS & EXPLANATION OF ISSUES
Active, approved, completed, "Open To All" profiles (like priyanshi, ID 23) do NOT appear in Recommended Matches or Search Results for certain users/contexts due to these backend issues:
1. **SQL-Level Caste Filter Exclusion in applyMandatoryFilters**:
   - In `api/preference_engine.py` line 72, `applyMandatoryFilters` filters queryset results by looking at the viewer's caste preference:
     `queryset = queryset.filter(caste__icontains=pref_caste)`
   - This filter is applied at the database (SQL) level. However, unlike the Community filter which has a bypass logic for Open To All profiles:
     `queryset = queryset.filter(Q(community_id__in=allowed_ids) | Q(visibility_type__in=['PLATFORM_WIDE', 'OPEN TO ALL']))`
   - The Caste filter has NO such bypass. Thus, any candidate profile whose caste does not match the viewer's caste preference is filtered out, even if their privacy mode is "Open To All" (`PLATFORM_WIDE`).
2. **Python-Level Filter Exclusions in check_mandatory_filters**:
   - In `api/rule_engine.py` line 100, `check_mandatory_filters` applies validation checks for several fields like Caste, Sub-Caste, State, City, Education, Occupation, and Height.
   - While the Community check explicitly bypasses Open To All profiles:
     `if pref_communities_str and candidate.visibility_type not in ('PLATFORM_WIDE', 'OPEN TO ALL'):`
   - None of the other fields (Caste, Sub-Caste, State, City, Education, Occupation) have bypasses for Open To All profiles. Therefore, if a viewer has any of these preferences set, any Open To All profile that fails to match them is excluded.
3. **Strict filter_by_community Application in get_queryset**:
   - In `api/views.py` line 2647, if a query parameter `community_id` is passed, `filter_by_community` is run:
     `queryset = filter_by_community(queryset, community_id)`
   - This strictly restricts profiles to the queried community and has no bypass logic for platform-wide/Open To All profiles. Since the frontend dashboard might filter profiles within specific communities, Open To All profiles belonging to other communities are completely filtered out.
4. **Viewer Profile Verification/Approval Lockout**:
   - In `api/views.py` line 2513, if the current logged-in viewer does not have an approved and verified profile in the database, they are restricted to seeing ONLY their own profile:
     `return queryset.filter(user=user).order_by('-id')`
   - This means new or unverified users cannot see any matches or Open To All profiles whatsoever on their dashboard or search results.
