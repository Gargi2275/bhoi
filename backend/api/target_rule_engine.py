import logging

logger = logging.getLogger(__name__)

class TargetRuleEngine:
    @staticmethod
    def canDiscoverTargetProfile(ownerProfile, viewerProfile) -> bool:
        """
        Determines if viewerProfile can discover ownerProfile based on owner's target rules.
        """
        return TargetRuleEngine.evaluate(ownerProfile, viewerProfile)

    @staticmethod
    def evaluate(ownerProfile, viewerProfile) -> bool:
        """
        Evaluates viewerProfile against ownerProfile's target matches criteria and prints logs.
        """
        if not ownerProfile or getattr(ownerProfile, 'deleted_at', None) is not None:
            return False

        from django.contrib.auth.models import User
        from api.models import Member, MatrimonyProfile

        user = None
        viewer_profile_obj = None
        viewer_member_obj = None

        if isinstance(viewerProfile, User):
            user = viewerProfile
            viewer_profile_obj = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()
            try:
                viewer_member_obj = user.member_profile
            except Exception:
                pass
        elif isinstance(viewerProfile, MatrimonyProfile):
            viewer_profile_obj = viewerProfile
            user = viewerProfile.user
            try:
                viewer_member_obj = user.member_profile
            except Exception:
                pass
        elif isinstance(viewerProfile, Member):
            viewer_member_obj = viewerProfile
            user = viewerProfile.user
            viewer_profile_obj = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()

        def get_viewer_value(field_name):
            if field_name == 'gender':
                val = getattr(viewer_profile_obj, 'gender', None)
                if not val and viewer_member_obj:
                    val = 'Groom' if getattr(viewer_member_obj, 'gender', '') == 'Male' else ('Bride' if getattr(viewer_member_obj, 'gender', '') == 'Female' else '')
                return val

            if field_name == 'age':
                val = getattr(viewer_profile_obj, 'age', None)
                if (val is None or val == 0) and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'age', None)
                return val

            if field_name == 'marital_status':
                return getattr(viewer_profile_obj, 'marital_status', '')

            if field_name == 'country':
                val = getattr(viewer_profile_obj, 'country', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'country', '')
                return val

            if field_name == 'state':
                val = getattr(viewer_profile_obj, 'state', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'state', '')
                return val

            if field_name == 'city':
                val = getattr(viewer_profile_obj, 'city', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'village', '')
                return val

            if field_name == 'community':
                val = getattr(viewer_profile_obj, 'community_id', None)
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'community_id', None)
                return val

            if field_name == 'sub_community':
                val = getattr(viewer_profile_obj, 'sub_caste', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'sub_caste', '')
                    if not val and getattr(viewer_member_obj, 'community', None):
                        val = getattr(viewer_member_obj.community, 'sub_caste', '')
                return val

            if field_name == 'religion':
                val = getattr(viewer_profile_obj, 'religion', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'religion', '')
                return val

            if field_name == 'caste':
                val = getattr(viewer_profile_obj, 'caste', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'caste', '')
                    if not val and getattr(viewer_member_obj, 'community', None):
                        val = getattr(viewer_member_obj.community, 'caste', '')
                return val

            if field_name == 'education':
                val = getattr(viewer_profile_obj, 'education', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'education', '')
                return val

            if field_name == 'occupation':
                val = getattr(viewer_profile_obj, 'profession', '')
                if not val and viewer_member_obj:
                    val = getattr(viewer_member_obj, 'profession', '')
                return val

            if field_name == 'languages':
                langs = []
                v_lk = getattr(viewer_profile_obj, 'languages_known', '')
                if v_lk:
                    langs.extend([x.strip().lower() for x in v_lk.split(',') if x.strip()])
                v_mt = getattr(viewer_profile_obj, 'mother_tongue', '')
                if v_mt:
                    langs.append(v_mt.strip().lower())
                return langs

            return None

        # 1. Gender Check
        target_gender = getattr(ownerProfile, 'target_gender', '').strip()
        gender_enabled = bool(target_gender and target_gender.lower() not in ('everyone', 'all', ''))
        gender_pass = True
        if gender_enabled:
            viewer_gender = get_viewer_value('gender')
            tg = 'bride' if 'bride' in target_gender.lower() or 'female' in target_gender.lower() else ('groom' if 'groom' in target_gender.lower() or 'male' in target_gender.lower() else target_gender.lower())
            vg = 'bride' if viewer_gender and ('bride' in str(viewer_gender).lower() or 'female' in str(viewer_gender).lower()) else ('groom' if viewer_gender and ('groom' in str(viewer_gender).lower() or 'male' in str(viewer_gender).lower()) else str(viewer_gender).lower())
            gender_pass = bool(viewer_gender and tg == vg)

        # 2. Age Check
        target_age_min = getattr(ownerProfile, 'target_age_min', None)
        target_age_max = getattr(ownerProfile, 'target_age_max', None)
        min_age = target_age_min if target_age_min is not None else 18
        max_age = target_age_max if target_age_max is not None else 60
        viewer_age = get_viewer_value('age')
        age_pass = bool(viewer_age is not None and min_age <= viewer_age <= max_age)

        # 3. Community Check (target_communities, caste, subcaste)
        comm_enabled = False
        comm_pass = True
        if ownerProfile.pk:
            try:
                comm_enabled = ownerProfile.target_communities.exists()
                if comm_enabled:
                    viewer_comm = get_viewer_value('community')
                    allowed_ids = list(ownerProfile.target_communities.values_list('id', flat=True))
                    comm_pass = bool(viewer_comm and viewer_comm in allowed_ids)
            except Exception:
                pass
        
        target_caste = getattr(ownerProfile, 'target_castes', '').strip()
        caste_enabled = bool(target_caste)
        caste_pass = True
        if caste_enabled:
            viewer_caste = get_viewer_value('caste')
            allowed = [x.strip().lower() for x in target_caste.split(',') if x.strip()]
            caste_pass = bool(viewer_caste and str(viewer_caste).strip().lower() in allowed)

        target_sub = getattr(ownerProfile, 'target_subcastes', '').strip()
        sub_enabled = bool(target_sub)
        sub_pass = True
        if sub_enabled:
            viewer_sub = get_viewer_value('sub_community')
            allowed = [x.strip().lower() for x in target_sub.split(',') if x.strip()]
            sub_pass = bool(viewer_sub and str(viewer_sub).strip().lower() in allowed)

        overall_community_pass = comm_pass and caste_pass and sub_pass

        # 4. Religion Check
        target_religion = getattr(ownerProfile, 'target_religions', '') or getattr(ownerProfile, 'target_religion', '').strip()
        religion_enabled = bool(target_religion)
        religion_pass = True
        if religion_enabled:
            viewer_religion = get_viewer_value('religion')
            allowed = [x.strip().lower() for x in target_religion.split(',') if x.strip()]
            religion_pass = bool(viewer_religion and str(viewer_religion).strip().lower() in allowed)

        # 5. Education Check
        target_edu = getattr(ownerProfile, 'target_educations', '').strip()
        edu_enabled = bool(target_edu)
        edu_pass = True
        if edu_enabled:
            viewer_edu = get_viewer_value('education')
            allowed = [x.strip().lower() for x in target_edu.split(',') if x.strip()]
            edu_pass = bool(viewer_edu and any(a == str(viewer_edu).strip().lower() or a in str(viewer_edu).strip().lower() for a in allowed))

        # 6. Occupation Check
        target_occ = getattr(ownerProfile, 'target_occupations', '').strip()
        occ_enabled = bool(target_occ)
        occ_pass = True
        if occ_enabled:
            viewer_occ = get_viewer_value('occupation')
            allowed = [x.strip().lower() for x in target_occ.split(',') if x.strip()]
            occ_pass = bool(viewer_occ and any(a == str(viewer_occ).strip().lower() or a in str(viewer_occ).strip().lower() for a in allowed))

        # 7. Location Check (country, state, city)
        target_country = getattr(ownerProfile, 'target_countries', '') or getattr(ownerProfile, 'target_country', '').strip()
        country_enabled = bool(target_country)
        country_pass = True
        if country_enabled:
            viewer_country = get_viewer_value('country')
            allowed = [x.strip().lower() for x in target_country.split(',') if x.strip()]
            country_pass = bool(viewer_country and str(viewer_country).strip().lower() in allowed)

        target_state = getattr(ownerProfile, 'target_states', '').strip()
        state_enabled = bool(target_state)
        state_pass = True
        if state_enabled:
            viewer_state = get_viewer_value('state')
            allowed = [x.strip().lower() for x in target_state.split(',') if x.strip()]
            state_pass = bool(viewer_state and str(viewer_state).strip().lower() in allowed)

        target_city = getattr(ownerProfile, 'target_cities', '').strip()
        city_enabled = bool(target_city)
        city_pass = True
        if city_enabled:
            viewer_city = get_viewer_value('city')
            allowed = [x.strip().lower() for x in target_city.split(',') if x.strip()]
            city_pass = bool(viewer_city and str(viewer_city).strip().lower() in allowed)

        overall_location_pass = country_pass and state_pass and city_pass

        # Other conditions (Marital Status, Language) that affect final decision but are not listed separately in output logs
        target_marital = getattr(ownerProfile, 'target_marital_statuses', '').strip()
        marital_enabled = bool(target_marital)
        marital_pass = True
        if marital_enabled:
            viewer_ms = get_viewer_value('marital_status')
            allowed = [x.strip().lower() for x in target_marital.split(',') if x.strip()]
            marital_pass = bool(viewer_ms and str(viewer_ms).strip().lower() in allowed)

        target_lang = getattr(ownerProfile, 'target_languages', '') or getattr(ownerProfile, 'target_language', '').strip()
        lang_enabled = bool(target_lang)
        lang_pass = True
        if lang_enabled:
            viewer_langs = get_viewer_value('languages')
            allowed = [x.strip().lower() for x in target_lang.split(',') if x.strip()]
            lang_pass = bool(viewer_langs and any(a in viewer_langs for a in allowed))

        final_result = gender_pass and age_pass and overall_community_pass and religion_pass and edu_pass and occ_pass and overall_location_pass and marital_pass and lang_pass

        # Print compact per-check log in the requested format
        viewer_name = getattr(viewer_profile_obj, 'name', '') or getattr(user, 'username', 'None')
        candidate_name = getattr(ownerProfile, 'name', '')
        print(f"\nViewer    : {viewer_name}")
        print(f"Candidate : {candidate_name}")
        print(f"Visibility: TARGET_MATCHES")
        if gender_enabled:
            print(f"Gender    : {'PASS' if gender_pass else 'FAIL'}")
        print(f"Age       : {'PASS' if age_pass else 'FAIL'}")
        if comm_enabled or caste_enabled or sub_enabled:
            print(f"Community : {'PASS' if overall_community_pass else 'FAIL'}")
        if religion_enabled:
            print(f"Religion  : {'PASS' if religion_pass else 'FAIL'}")
        if edu_enabled:
            print(f"Education : {'PASS' if edu_pass else 'FAIL'}")
        if occ_enabled:
            print(f"Occupation: {'PASS' if occ_pass else 'FAIL'}")
        if country_enabled or state_enabled or city_enabled:
            print(f"Location  : {'PASS' if overall_location_pass else 'FAIL'}")
        if marital_enabled:
            print(f"Marital   : {'PASS' if marital_pass else 'FAIL'}")
        if lang_enabled:
            print(f"Language  : {'PASS' if lang_pass else 'FAIL'}")
        print(f"Final     : {'PASS' if final_result else 'FAIL'}")
        print(f"Returned  : {'YES' if final_result else 'NO'}")

        # Save failed/matched conditions for test assertions (only if enabled)
        failed_conditions = []
        matched_conditions = []
        
        if gender_enabled:
            if gender_pass: matched_conditions.append('Gender')
            else: failed_conditions.append('Gender')
            
        # Age is always enabled
        if age_pass: matched_conditions.append('Age')
        else: failed_conditions.append('Age')
        
        if marital_enabled:
            if marital_pass: matched_conditions.append('Marital Status')
            else: failed_conditions.append('Marital Status')
            
        if country_enabled:
            if country_pass: matched_conditions.append('Country')
            else: failed_conditions.append('Country')
            
        if state_enabled:
            if state_pass: matched_conditions.append('State')
            else: failed_conditions.append('State')
            
        if city_enabled:
            if city_pass: matched_conditions.append('City')
            else: failed_conditions.append('City')
            
        if comm_enabled:
            if comm_pass: matched_conditions.append('Community')
            else: failed_conditions.append('Community')
            
        if sub_enabled:
            if sub_pass: matched_conditions.append('Sub Community')
            else: failed_conditions.append('Sub Community')
            
        if religion_enabled:
            if religion_pass: matched_conditions.append('Religion')
            else: failed_conditions.append('Religion')
            
        if caste_enabled:
            if caste_pass: matched_conditions.append('Caste')
            else: failed_conditions.append('Caste')
            
        if edu_enabled:
            if edu_pass: matched_conditions.append('Education')
            else: failed_conditions.append('Education')
            
        if occ_enabled:
            if occ_pass: matched_conditions.append('Occupation')
            else: failed_conditions.append('Occupation')
            
        if lang_enabled:
            if lang_pass: matched_conditions.append('Language')
            else: failed_conditions.append('Language')

        enabled_conditions_names = [
            'Gender' if gender_enabled else None,
            'Age', # always enabled
            'Marital Status' if marital_enabled else None,
            'Country' if country_enabled else None,
            'State' if state_enabled else None,
            'City' if city_enabled else None,
            'Community' if comm_enabled else None,
            'Sub Community' if sub_enabled else None,
            'Religion' if religion_enabled else None,
            'Caste' if caste_enabled else None,
            'Education' if edu_enabled else None,
            'Occupation' if occ_enabled else None,
            'Language' if lang_enabled else None,
        ]
        enabled_conditions_names = [n for n in enabled_conditions_names if n is not None]
        
        is_empty_target_rules = False
        if len(enabled_conditions_names) == 0:
            is_empty_target_rules = True
        elif len(enabled_conditions_names) == 1 and enabled_conditions_names[0] == 'Age':
            if min_age == 18 and max_age == 60:
                is_empty_target_rules = True

        if is_empty_target_rules:
            ownerProfile._failed_conditions = []
            ownerProfile._matched_conditions = []
        else:
            ownerProfile._failed_conditions = failed_conditions
            ownerProfile._matched_conditions = matched_conditions

        return final_result
