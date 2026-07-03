import logging
import re
from django.db.models import Q
from django.core.cache import cache
from django.conf import settings
from rest_framework.exceptions import ValidationError
from api.models import MatrimonyProfile, PartnerPreference

logger = logging.getLogger(__name__)

class PreferenceEngine:
    @staticmethod
    def get_pref_cache_key(viewer_id, candidate_id):
        return f"pref_match_score_{viewer_id}_{candidate_id}"

    @staticmethod
    def get_recommendations_cache_key(viewer_id):
        return f"pref_recommendations_{viewer_id}"

    @staticmethod
    def get_preferences_cache_key(profile_id):
        return f"profile_preferences_data_{profile_id}"

    @staticmethod
    def invalidate_cache_for_profile(profile_id):
        """Invalidates all matching/recommendation caches related to this profile ID."""
        logger.info(f"[PreferenceEngine] Invalidating cache for profile {profile_id}")
        cache.delete(PreferenceEngine.get_recommendations_cache_key(profile_id))
        cache.delete(PreferenceEngine.get_preferences_cache_key(profile_id))

    @staticmethod
    def get_partner_preference(profile):
        """Helper to get or create partner preference for a profile."""
        if not profile:
            return None
        pref, created = PartnerPreference.objects.get_or_create(profile=profile)
        return pref

    @staticmethod
    def validate_preferences(preferences_dict):
        """
        Validates preferences payload, raising rest_framework ValidationError if any constraints are violated.
        """
        errors = {}

        # 1. Minimum Age > Maximum Age
        min_age_item = preferences_dict.get('min_age')
        max_age_item = preferences_dict.get('max_age')
        if min_age_item and max_age_item:
            min_age_val = min_age_item.get('value')
            max_age_val = max_age_item.get('value')
            if min_age_val is not None and max_age_val is not None:
                try:
                    if int(min_age_val) > int(max_age_val):
                        errors['age_range'] = "Minimum age cannot be greater than maximum age."
                except (ValueError, TypeError):
                    errors['age_range'] = "Age values must be integers."

        # 2. Negative Income / Min Income > Max Income
        income_min_item = preferences_dict.get('income_min')
        income_max_item = preferences_dict.get('income_max')
        if income_min_item and income_max_item:
            income_min_val = income_min_item.get('value')
            income_max_val = income_max_item.get('value')
            if income_min_val is not None and income_max_val is not None:
                try:
                    if float(income_min_val) < 0 or float(income_max_val) < 0:
                        errors['income_range'] = "Income values cannot be negative."
                    elif float(income_min_val) > float(income_max_val):
                        errors['income_range'] = "Minimum income cannot be greater than maximum income."
                except (ValueError, TypeError):
                    pass

        # 3. Height Range Min > Max
        height_min_item = preferences_dict.get('height_min')
        height_max_item = preferences_dict.get('height_max')
        if height_min_item and height_max_item:
            height_min_val = height_min_item.get('value')
            height_max_val = height_max_item.get('value')
            if height_min_val is not None and height_max_val is not None:
                from api.rule_engine import MatrimonyRuleEngine
                min_inches = MatrimonyRuleEngine.parse_h_to_inches(height_min_val)
                max_inches = MatrimonyRuleEngine.parse_h_to_inches(height_max_val)
                if min_inches > 0 and max_inches > 0 and min_inches > max_inches:
                    errors['height_range'] = "Minimum height cannot be greater than maximum height."

        # 4. Duplicate Communities
        community_item = preferences_dict.get('preferred_community')
        if community_item:
            comm_val = community_item.get('value')
            if isinstance(comm_val, list):
                if len(comm_val) != len(set(comm_val)):
                    errors['preferred_community'] = "Duplicate communities are not allowed."

        # 5. Gender Conflict Validation
        gender_item = preferences_dict.get('preferred_gender')
        if gender_item:
            gender_val = gender_item.get('value')
            if gender_val and gender_val not in ['Bride', 'Groom', 'Any']:
                errors['preferred_gender'] = "Invalid gender selection."

        if errors:
            raise ValidationError(errors)
        return True

    @staticmethod
    def save_preferences(profile_id, preferences_dict):
        """
        Validates and saves preferences for the given profile ID.
        """
        PreferenceEngine.validate_preferences(preferences_dict)

        profile = MatrimonyProfile.objects.get(id=profile_id)
        pref, created = PartnerPreference.objects.get_or_create(profile=profile)
        pref.preferences_data = preferences_dict

        # Backward compatibility sync to db columns
        field_mappings = {
            'preferred_gender': 'gender',
            'min_age': 'min_age',
            'max_age': 'max_age',
            'preferred_marital_status': 'marital_status',
            'preferred_religion': 'religion',
            'preferred_community': 'caste',
            'preferred_sub_community': 'sub_caste',
            'preferred_mother_tongue': 'mother_tongue',
            'education_level': 'education',
            'occupation': 'occupation',
            'city': 'city',
            'state': 'state',
            'country': 'country',
            'diet': 'diet',
            'smoking': 'smoking',
            'drinking': 'drinking',
            'willing_to_relocate': 'willing_to_relocate',
            'profile_verified_only': 'profile_verified_only',
            'photo_required': 'photo_required',
        }

        for k, col in field_mappings.items():
            if k in preferences_dict:
                val = preferences_dict[k].get('value')
                if isinstance(val, list):
                    val = ",".join(str(x) for x in val)
                if val is not None:
                    setattr(pref, col, val)

        if 'height_min' in preferences_dict:
            pref.min_height = preferences_dict['height_min'].get('value') or ''
        if 'height_max' in preferences_dict:
            pref.max_height = preferences_dict['height_max'].get('value') or ''

        if 'income_min' in preferences_dict or 'income_max' in preferences_dict:
            min_inc = preferences_dict.get('income_min', {}).get('value') or ''
            max_inc = preferences_dict.get('income_max', {}).get('value') or ''
            pref.income_range = f"{min_inc}-{max_inc}" if min_inc or max_inc else ''

        pref.save()

        # Invalidate caches
        cache.delete(PreferenceEngine.get_preferences_cache_key(profile_id))
        PreferenceEngine.invalidate_cache_for_profile(profile_id)
        return pref

    @staticmethod
    def load_preferences(profile_id):
        """
        Loads cached preferences for the given profile ID.
        """
        cache_key = PreferenceEngine.get_preferences_cache_key(profile_id)
        cached = cache.get(cache_key)
        if cached:
            return cached

        profile = MatrimonyProfile.objects.select_related('partner_preference').get(id=profile_id)
        try:
            pref = profile.partner_preference
        except PartnerPreference.DoesNotExist:
            pref = PartnerPreference.objects.create(profile=profile)

        pref_data = pref.preferences_data
        if not pref_data:
            pref_data = PreferenceEngine._build_default_preferences_data(pref)
            pref.preferences_data = pref_data
            pref.save()

        cache.set(cache_key, pref_data, timeout=3600)
        return pref_data

    @staticmethod
    def _build_default_preferences_data(pref):
        data = {}
        def add_field(name, value, enabled, weight, mode):
            data[name] = {
                'value': value,
                'enabled': enabled,
                'weight': weight,
                'mode': mode
            }

        add_field('preferred_gender', pref.gender or 'Any', bool(pref.gender), 100, 'Hard')
        add_field('min_age', pref.min_age or 18, True, 20, 'Soft')
        add_field('max_age', pref.max_age or 60, True, 20, 'Soft')
        add_field('preferred_marital_status', pref.marital_status or 'Any', bool(pref.marital_status), 15, 'Soft')
        add_field('height_min', pref.min_height or '', bool(pref.min_height), 10, 'Soft')
        add_field('height_max', pref.max_height or '', bool(pref.max_height), 10, 'Soft')
        add_field('preferred_religion', pref.religion or 'Any', bool(pref.religion), 10, 'Soft')
        add_field('preferred_community', pref.caste or 'Any', bool(pref.caste), 15, 'Soft')
        add_field('preferred_sub_community', pref.sub_caste or 'Any', bool(pref.sub_caste), 10, 'Soft')
        add_field('preferred_mother_tongue', pref.mother_tongue or 'Any', bool(pref.mother_tongue), 10, 'Soft')

        add_field('education_level', pref.education or '', bool(pref.education), 15, 'Soft')
        add_field('degree', '', False, 10, 'Soft')
        add_field('professional_qualification', '', False, 10, 'Soft')
        add_field('field_of_study', '', False, 10, 'Soft')

        add_field('occupation', pref.occupation or '', bool(pref.occupation), 15, 'Soft')
        add_field('industry', '', False, 10, 'Soft')
        add_field('employment_type', '', False, 10, 'Soft')

        inc_min, inc_max = '', ''
        if pref.income_range and '-' in pref.income_range:
            parts = pref.income_range.split('-')
            if len(parts) == 2:
                inc_min, inc_max = parts[0].strip(), parts[1].strip()
        add_field('income_min', inc_min, bool(inc_min), 10, 'Soft')
        add_field('income_max', inc_max, bool(inc_max), 10, 'Soft')

        add_field('diet', pref.diet or 'Any', bool(pref.diet), 5, 'Soft')
        add_field('smoking', pref.smoking or 'Any', bool(pref.smoking), 5, 'Soft')
        add_field('drinking', pref.drinking or 'Any', bool(pref.drinking), 5, 'Soft')
        add_field('disability_preference', pref.disability_preference or 'Any', bool(pref.disability_preference), 5, 'Soft')
        add_field('willing_to_relocate', pref.willing_to_relocate or 'Any', bool(pref.willing_to_relocate), 5, 'Soft')

        add_field('country', pref.country or 'Any', bool(pref.country), 5, 'Soft')
        add_field('state', pref.state or 'Any', bool(pref.state), 10, 'Soft')
        add_field('city', pref.city or 'Any', bool(pref.city), 10, 'Soft')
        add_field('native_place', '', False, 5, 'Soft')
        add_field('nri_accepted', pref.abroad_preference.lower() == 'yes' if pref.abroad_preference else True, bool(pref.abroad_preference), 5, 'Soft')

        add_field('family_type', pref.family_type or 'Any', bool(pref.family_type), 5, 'Soft')
        add_field('family_values', pref.family_values or 'Any', bool(pref.family_values), 5, 'Soft')
        add_field('family_status', pref.family_status or 'Any', bool(pref.family_status), 5, 'Soft')

        add_field('hobbies', '', False, 5, 'Soft')
        add_field('languages', pref.preferred_languages or '', bool(pref.preferred_languages), 5, 'Soft')
        add_field('interests', '', False, 5, 'Soft')
        add_field('horoscope_required', pref.horoscope_matching.lower() == 'yes' if pref.horoscope_matching else False, bool(pref.horoscope_matching), 5, 'Soft')
        add_field('manglik_preference', pref.manglik or 'Any', bool(pref.manglik), 5, 'Soft')

        add_field('profile_verified_only', pref.profile_verified_only, pref.profile_verified_only, 5, 'Soft')
        add_field('photo_required', pref.photo_required, pref.photo_required, 5, 'Soft')

        return data

    @staticmethod
    def sync_columns_to_json(pref):
        """
        Synchronizes flat database columns of PartnerPreference to preferences_data JSON.
        """
        if pref.preferences_data is None:
            pref.preferences_data = {}

        pref_data = pref.preferences_data

        def sync_field(json_key, col_val, default_val='Any', default_weight=10, default_mode='Soft'):
            if json_key in ('preferred_community', 'preferred_marital_status', 'preferred_religion', 'preferred_mother_tongue', 'preferred_sub_community', 'languages'):
                if col_val and isinstance(col_val, str) and ',' in col_val:
                    col_val = [x.strip() for x in col_val.split(',')]

            if json_key in ('min_age', 'max_age'):
                is_enabled = True
            elif isinstance(col_val, bool):
                is_enabled = col_val
            else:
                is_enabled = col_val is not None and col_val != '' and str(col_val).lower() not in ('any', 'everyone')
            
            if json_key not in pref_data or not isinstance(pref_data[json_key], dict):
                pref_data[json_key] = {
                    'value': col_val if col_val is not None else default_val,
                    'enabled': is_enabled,
                    'weight': default_weight,
                    'mode': default_mode
                }
            else:
                pref_data[json_key]['value'] = col_val if col_val is not None else default_val
                pref_data[json_key]['enabled'] = is_enabled

        sync_field('preferred_gender', pref.gender, 'Any', 100, 'Hard')
        sync_field('min_age', pref.min_age, 18, 20, 'Soft')
        sync_field('max_age', pref.max_age, 60, 20, 'Soft')
        sync_field('preferred_marital_status', pref.marital_status, 'Any', 15, 'Soft')

        sync_field('height_min', pref.min_height, '', 10, 'Soft')
        sync_field('height_max', pref.max_height, '', 10, 'Soft')

        sync_field('preferred_religion', pref.religion, 'Any', 10, 'Soft')
        sync_field('preferred_community', pref.caste, 'Any', 15, 'Soft')
        sync_field('preferred_sub_community', pref.sub_caste, 'Any', 10, 'Soft')
        sync_field('preferred_mother_tongue', pref.mother_tongue, 'Any', 10, 'Soft')

        sync_field('education_level', pref.education, '', 15, 'Soft')
        sync_field('occupation', pref.occupation, '', 15, 'Soft')

        # Income Range parsing
        inc_min, inc_max = '', ''
        if pref.income_range and '-' in pref.income_range:
            parts = pref.income_range.split('-')
            if len(parts) == 2:
                inc_min, inc_max = parts[0].strip(), parts[1].strip()
        elif pref.income_range:
            inc_min = pref.income_range

        sync_field('income_min', inc_min, '', 10, 'Soft')
        sync_field('income_max', inc_max, '', 10, 'Soft')

        sync_field('diet', pref.diet, 'Any', 5, 'Soft')
        sync_field('smoking', pref.smoking, 'Any', 5, 'Soft')
        sync_field('drinking', pref.drinking, 'Any', 5, 'Soft')
        sync_field('disability_preference', pref.disability_preference, 'Any', 5, 'Soft')
        sync_field('willing_to_relocate', pref.willing_to_relocate, 'Any', 5, 'Soft')

        sync_field('country', pref.country, 'Any', 5, 'Soft')
        sync_field('state', pref.state, 'Any', 10, 'Soft')
        sync_field('city', pref.city, 'Any', 10, 'Soft')

        sync_field('profile_verified_only', pref.profile_verified_only, False, 5, 'Soft')
        sync_field('photo_required', pref.photo_required, False, 5, 'Soft')

        pref.preferences_data = pref_data

    @staticmethod
    def calculate_compatibility(viewer_profile, candidate_profile):
        """
        Calculates compatibility between viewer's preferences and candidate_profile.
        """
        if not viewer_profile or not candidate_profile:
            return {
                "compatibility": 100,
                "matched_fields": [],
                "unmatched_fields": [],
                "matched_count": 0,
                "failed_hard_rules": [],
                "passed_hard_rules": []
            }

        # Get partner preferences, leverage prefetch if available
        try:
            if hasattr(viewer_profile, 'partner_preference') and viewer_profile.partner_preference is not None:
                pref = viewer_profile.partner_preference
            else:
                pref = PartnerPreference.objects.get(profile=viewer_profile)

            pref_data = pref.preferences_data
            if not pref_data:
                pref_data = PreferenceEngine._build_default_preferences_data(pref)
        except PartnerPreference.DoesNotExist:
            pref_data = {}

        # If no preferences are enabled/set, return 100% compatibility
        enabled_rules = {k: v for k, v in pref_data.items() if v.get('enabled', False)}
        if not enabled_rules:
            return {
                "compatibility": 100,
                "matched_fields": [],
                "unmatched_fields": [],
                "matched_count": 0,
                "failed_hard_rules": [],
                "passed_hard_rules": []
            }

        score = 0
        max_possible_score = 0
        matched_fields = []
        unmatched_fields = []
        failed_hard_rules = []
        passed_hard_rules = []

        for rule_name, rule in enabled_rules.items():
            val = rule.get('value')
            weight = int(rule.get('weight', 10))
            mode = rule.get('mode', 'Soft')

            try:
                matched = PreferenceEngine._check_rule(rule_name, val, candidate_profile)
            except Exception as e:
                logger.error(f"Error checking rule {rule_name}: {e}")
                matched = False

            # Log the comparison
            logger.info(
                f"[PreferenceEngine Match Log] Viewer Profile: {viewer_profile.id} | "
                f"Candidate Profile: {candidate_profile.id} | "
                f"Rule: {rule_name} | "
                f"Expected: {val} | "
                f"Actual: {PreferenceEngine._get_candidate_value(rule_name, candidate_profile)} | "
                f"Matched: {matched} | "
                f"Weight: {weight} | "
                f"Mode: {mode}"
            )

            human_readable = rule_name.replace('_', ' ').title()

            if mode == 'Hard':
                if matched:
                    score += weight
                    max_possible_score += weight
                    passed_hard_rules.append(human_readable)
                    matched_fields.append(human_readable)
                else:
                    max_possible_score += weight
                    failed_hard_rules.append(human_readable)
                    unmatched_fields.append(human_readable)
            else: # Soft
                max_possible_score += weight
                if matched:
                    score += weight
                    matched_fields.append(human_readable)
                else:
                    unmatched_fields.append(human_readable)

        if failed_hard_rules:
            compatibility = 0
        else:
            compatibility = int((score / max_possible_score) * 100) if max_possible_score > 0 else 100

        logger.info(
            f"[PreferenceEngine Final Compatibility] Viewer: {viewer_profile.id} | "
            f"Candidate: {candidate_profile.id} | Compatibility: {compatibility}%"
        )

        return {
            "compatibility": compatibility,
            "matched_fields": matched_fields,
            "unmatched_fields": unmatched_fields,
            "matched_count": len(matched_fields),
            "failed_hard_rules": failed_hard_rules,
            "passed_hard_rules": passed_hard_rules
        }

    @staticmethod
    def compare_profiles(profile_a, profile_b):
        """
        Compare profile A's preferences against profile B, and profile B's preferences against profile A.
        """
        return {
            "a_to_b": PreferenceEngine.calculate_compatibility(profile_a, profile_b),
            "b_to_a": PreferenceEngine.calculate_compatibility(profile_b, profile_a)
        }

    @staticmethod
    def explain_compatibility(viewer_profile, candidate_profile):
        """
        Explains why the compatibility score is what it is.
        """
        res = PreferenceEngine.calculate_compatibility(viewer_profile, candidate_profile)
        explanation = f"Compatibility is {res['compatibility']}%."
        if res['failed_hard_rules']:
            explanation += f" Failed hard filters: {', '.join(res['failed_hard_rules'])}."
        else:
            explanation += " Passed all hard filters."

        explanation += f" Matched fields: {', '.join(res['matched_fields'])}."
        explanation += f" Unmatched fields: {', '.join(res['unmatched_fields'])}."

        res['explanation'] = explanation
        return res

    @staticmethod
    def _parse_income_string_to_number(income_str):
        if not income_str:
            return None
        income_str = str(income_str).lower().strip()
        nums = re.findall(r"\d+\.?\d*", income_str)
        if not nums:
            return None
        try:
            val = float(nums[0])
            if 'crore' in income_str or 'cr' in income_str:
                val *= 10000000
            elif 'lakh' in income_str or 'l' in income_str or 'lp' in income_str:
                val *= 100000
            elif val < 100:
                val *= 100000
            return val
        except ValueError:
            return None

    @staticmethod
    def _check_rule(rule_name, pref_val, candidate_profile):
        # Empty preferences never reject
        if pref_val is None or pref_val == '' or str(pref_val).lower() in ('any', 'everyone'):
            return True

        if rule_name in ('gender', 'preferred_gender'):
            cand_gender = (candidate_profile.gender or '').strip().lower()
            pref_gender = str(pref_val).strip().lower()
            if pref_gender == 'groom':
                return cand_gender == 'groom'
            elif pref_gender == 'bride':
                return cand_gender == 'bride'
            return cand_gender == pref_gender

        if rule_name in ('min_age', 'age_min'):
            return candidate_profile.age >= int(pref_val)

        if rule_name in ('max_age', 'age_max'):
            return candidate_profile.age <= int(pref_val)

        if rule_name in ('marital_status', 'preferred_marital_status'):
            cand_status = (candidate_profile.marital_status or '').strip().lower()
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            return cand_status in pref_list or any(item in cand_status or cand_status in item for item in pref_list if item)

        if rule_name in ('height_min', 'min_height'):
            from api.rule_engine import MatrimonyRuleEngine
            pref_inches = MatrimonyRuleEngine.parse_h_to_inches(pref_val)
            cand_inches = MatrimonyRuleEngine.parse_h_to_inches(candidate_profile.height)
            if pref_inches == 0 or cand_inches == 0:
                return True
            return cand_inches >= pref_inches

        if rule_name in ('height_max', 'max_height'):
            from api.rule_engine import MatrimonyRuleEngine
            pref_inches = MatrimonyRuleEngine.parse_h_to_inches(pref_val)
            cand_inches = MatrimonyRuleEngine.parse_h_to_inches(candidate_profile.height)
            if pref_inches == 0 or cand_inches == 0:
                return True
            return cand_inches <= pref_inches

        if rule_name in ('religion', 'preferred_religion'):
            cand_rel = (candidate_profile.religion or '').strip().lower()
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            return cand_rel in pref_list or any(item in cand_rel for item in pref_list if item)

        if rule_name in ('community', 'preferred_community', 'preferred_communities'):
            cand_comm_id = candidate_profile.community_id
            cand_comm_name = (candidate_profile.community.name or '').strip().lower() if candidate_profile.community else ''
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            for p in pref_list:
                if p.isdigit() and int(p) == cand_comm_id:
                    return True
                if p == cand_comm_name:
                    return True
            return False

        if rule_name in ('sub_community', 'preferred_sub_community', 'sub_caste'):
            cand_sub = (candidate_profile.sub_caste or '').strip().lower()
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            return cand_sub in pref_list or any(item in cand_sub for item in pref_list if item)

        if rule_name in ('mother_tongue', 'preferred_mother_tongue'):
            cand_mt = (candidate_profile.mother_tongue or '').strip().lower()
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            return cand_mt in pref_list or any(item in cand_mt for item in pref_list if item)

        if rule_name in ('education_level', 'education', 'degree', 'professional_qualification', 'field_of_study'):
            cand_edu = (candidate_profile.education or '').strip().lower()
            fm = getattr(candidate_profile, 'family_member', None)
            cand_degree = (fm.degree or '').strip().lower() if fm else ''
            cand_field = (fm.field_of_study or '').strip().lower() if fm else ''
            pref_str = str(pref_val).strip().lower()
            return pref_str in cand_edu or pref_str in cand_degree or pref_str in cand_field

        if rule_name in ('occupation', 'professional_qualification'):
            cand_prof = (candidate_profile.profession or '').strip().lower()
            fm = getattr(candidate_profile, 'family_member', None)
            cand_job = (fm.job_title or '').strip().lower() if fm else ''
            cand_occ = (fm.occupation or '').strip().lower() if fm else ''
            pref_str = str(pref_val).strip().lower()
            return pref_str in cand_prof or pref_str in cand_job or pref_str in cand_occ

        if rule_name == 'industry':
            fm = getattr(candidate_profile, 'family_member', None)
            cand_ind = (fm.industry or '').strip().lower() if fm else ''
            return str(pref_val).strip().lower() in cand_ind

        if rule_name == 'employment_type':
            fm = getattr(candidate_profile, 'family_member', None)
            cand_type = (fm.profession_type or '').strip().lower() if fm else ''
            return str(pref_val).strip().lower() in cand_type

        if rule_name == 'income_min':
            cand_inc_val = PreferenceEngine._parse_income_string_to_number(candidate_profile.income or getattr(getattr(candidate_profile, 'family_member', None), 'salary', None))
            if cand_inc_val is None:
                return True
            return cand_inc_val >= float(pref_val)

        if rule_name == 'income_max':
            cand_inc_val = PreferenceEngine._parse_income_string_to_number(candidate_profile.income or getattr(getattr(candidate_profile, 'family_member', None), 'salary', None))
            if cand_inc_val is None:
                return True
            return cand_inc_val <= float(pref_val)

        if rule_name == 'diet':
            return (candidate_profile.diet or '').strip().lower() == str(pref_val).strip().lower()

        if rule_name == 'smoking':
            return (candidate_profile.smoking or '').strip().lower() == str(pref_val).strip().lower()

        if rule_name == 'drinking':
            return (candidate_profile.drinking or '').strip().lower() == str(pref_val).strip().lower()

        if rule_name == 'disability_preference':
            # Check if disability preference matches candidate disability
            cand_dis = (getattr(candidate_profile, 'disability_preference', '') or '').strip().lower()
            return str(pref_val).strip().lower() in cand_dis

        if rule_name == 'willing_to_relocate':
            return (getattr(candidate_profile, 'willing_to_relocate', '') or '').strip().lower() == str(pref_val).strip().lower()

        if rule_name == 'country':
            return (candidate_profile.country or '').strip().lower() == str(pref_val).strip().lower()

        if rule_name == 'state':
            return str(pref_val).strip().lower() in (candidate_profile.state or '').strip().lower()

        if rule_name == 'city':
            return str(pref_val).strip().lower() in (candidate_profile.city or '').strip().lower()

        if rule_name == 'native_place':
            return str(pref_val).strip().lower() in (candidate_profile.native_place or '').strip().lower()

        if rule_name == 'nri_accepted':
            is_nri = (candidate_profile.country or '').strip().lower() != 'india'
            if not pref_val:
                return not is_nri
            return True

        if rule_name in ('family_type', 'family_values', 'family_status'):
            cand_fam = (candidate_profile.family_details or '').strip().lower()
            return str(pref_val).strip().lower() in cand_fam

        if rule_name == 'hobbies':
            cand_about = (candidate_profile.about or '').strip().lower()
            return any(x.strip().lower() in cand_about for x in str(pref_val).split(',') if x.strip())

        if rule_name in ('languages', 'preferred_languages'):
            cand_lang = (candidate_profile.languages_known or '').strip().lower()
            if isinstance(pref_val, list):
                pref_list = [str(x).strip().lower() for x in pref_val]
            else:
                pref_list = [x.strip().lower() for x in str(pref_val).split(',')]
            return any(item in cand_lang for item in pref_list if item)

        if rule_name == 'interests':
            cand_about = (candidate_profile.about or '').strip().lower()
            return any(x.strip().lower() in cand_about for x in str(pref_val).split(',') if x.strip())

        if rule_name == 'horoscope_required':
            return True

        if rule_name == 'manglik_preference':
            cand_manglik = (getattr(candidate_profile, 'manglik', '') or '').strip().lower()
            return str(pref_val).strip().lower() in cand_manglik

        if rule_name == 'profile_verified_only':
            return candidate_profile.is_verified

        if rule_name == 'photo_required':
            return candidate_profile.photos.exists() or bool(candidate_profile.photo)

        return True

    @staticmethod
    def _get_candidate_value(rule_name, candidate_profile):
        if rule_name in ('gender', 'preferred_gender'):
            return candidate_profile.gender
        if rule_name in ('min_age', 'max_age', 'age_min', 'age_max'):
            return candidate_profile.age
        if rule_name in ('marital_status', 'preferred_marital_status'):
            return candidate_profile.marital_status
        if rule_name in ('height_min', 'min_height', 'height_max', 'max_height'):
            return candidate_profile.height
        if rule_name in ('religion', 'preferred_religion'):
            return candidate_profile.religion
        if rule_name in ('community', 'preferred_community', 'preferred_communities'):
            return candidate_profile.community_id
        if rule_name in ('sub_community', 'preferred_sub_community', 'sub_caste'):
            return candidate_profile.sub_caste
        if rule_name in ('mother_tongue', 'preferred_mother_tongue'):
            return candidate_profile.mother_tongue
        if rule_name in ('education_level', 'education'):
            return candidate_profile.education
        if rule_name == 'occupation':
            return candidate_profile.profession
        if rule_name == 'diet':
            return candidate_profile.diet
        if rule_name == 'smoking':
            return candidate_profile.smoking
        if rule_name == 'drinking':
            return candidate_profile.drinking
        if rule_name == 'country':
            return candidate_profile.country
        if rule_name == 'state':
            return candidate_profile.state
        if rule_name == 'city':
            return candidate_profile.city
        return "N/A"
