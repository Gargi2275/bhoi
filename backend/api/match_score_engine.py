import logging

logger = logging.getLogger(__name__)

class MatchScoreEngine:
    @staticmethod
    def calculateMatchScore(profile, other_profile):
        """
        Calculates dynamic match score between two profiles (0-100%).
        """
        if not other_profile or profile.id == other_profile.id:
            return {
                "score": 100,
                "breakdown": {},
                "reasons": ["Self Profile"],
                "negatives": []
            }

        pref = getattr(profile, 'partner_preference', None)
        if not pref:
            # Fallback to general logic
            score = 30
            # Age: +/- 5 years
            min_age = max(18, profile.age - 5)
            max_age = min(100, profile.age + 5)
            if min_age <= other_profile.age <= max_age:
                score += 20
            elif abs(other_profile.age - profile.age) <= 8:
                score += 10

            # Community & Caste
            if profile.community_id == other_profile.community_id:
                score += 10
            elif profile.community and other_profile.community:
                self_ancestors = {c['id'] for c in profile.community.ancestors_list} if hasattr(profile.community, 'ancestors_list') else set()
                other_ancestors = {c['id'] for c in other_profile.community.ancestors_list} if hasattr(other_profile.community, 'ancestors_list') else set()
                if profile.community_id in other_ancestors or other_profile.community_id in self_ancestors:
                    score += 7
                else:
                    score += 3
            
            self_caste = (profile.caste or '').strip().lower()
            other_caste = (other_profile.caste or '').strip().lower()
            if self_caste and self_caste == other_caste:
                score += 10
            elif self_caste and other_caste and (self_caste in other_caste or other_caste in self_caste):
                score += 7
            else:
                score += 2

            # Location
            self_city = (profile.city or '').strip().lower()
            other_city = (other_profile.city or '').strip().lower()
            self_state = (profile.state or '').strip().lower()
            other_state = (other_profile.state or '').strip().lower()
            if profile.country.strip().lower() == other_profile.country.strip().lower():
                if self_city and self_city == other_city:
                    score += 15
                elif self_state and self_state == other_state:
                    score += 10
                else:
                    score += 5

            # Education
            self_edu = (profile.education or '').strip().lower()
            other_edu = (other_profile.education or '').strip().lower()
            if self_edu and other_edu:
                if self_edu == other_edu:
                    score += 15
                elif any(w in self_edu and w in other_edu for w in ['engg', 'btech', 'mtech', 'mba', 'ca', 'phd', 'graduate', 'doctor', 'be', 'bcom', 'ma', 'ba', 'bsc', 'msc']):
                    score += 10
                else:
                    score += 5
            else:
                score += 5

            # Occupation
            self_prof = (profile.profession or '').strip().lower()
            other_prof = (other_profile.profession or '').strip().lower()
            if self_prof and other_prof:
                if self_prof == other_prof:
                    score += 10
                elif any(w in self_prof and w in other_prof for w in ['soft', 'eng', 'tech', 'manage', 'doc', 'medic', 'teach', 'service', 'business', 'own', 'finance', 'consult']):
                    score += 8
                else:
                    score += 5
            else:
                score += 5

            # Marital Status
            self_ms = (profile.marital_status or '').strip().lower()
            other_ms = (other_profile.marital_status or '').strip().lower()
            if self_ms == other_ms:
                score += 10
            else:
                score += 5

            # Lifestyle
            self_diet = (profile.diet or '').strip().lower()
            other_diet = (other_profile.diet or '').strip().lower()
            if self_diet == other_diet:
                score += 4
            else:
                score += 1

            self_smoke = (profile.smoking or '').strip().lower()
            other_smoke = (other_profile.smoking or '').strip().lower()
            if self_smoke == other_smoke:
                score += 3
            else:
                score += 1

            self_drink = (profile.drinking or '').strip().lower()
            other_drink = (other_profile.drinking or '').strip().lower()
            if self_drink == other_drink:
                score += 3
            else:
                score += 1

            final_score = min(max(score, 30), 100)
            return {
                "score": final_score,
                "breakdown": {},
                "reasons": ["✓ Basic Match"],
                "negatives": []
            }

        # Otherwise use preference-based calculation
        breakdown = {
            "age": 0,
            "community_caste": 0,
            "marital_status": 0,
            "education": 0,
            "occupation": 0,
            "location": 0,
            "lifestyle": 0,
            "religion": 0,
            "income": 0
        }
        reasons = []
        negatives = []

        # 1. Age (20 Points)
        min_age = pref.min_age if pref.min_age is not None else 18
        max_age = pref.max_age if pref.max_age is not None else 60
        if min_age <= other_profile.age <= max_age:
            breakdown["age"] = 20
            reasons.append("✓ Age matched preferred range")
        elif abs(other_profile.age - ((min_age + max_age) / 2)) <= ((max_age - min_age) / 2) + 5:
            breakdown["age"] = 10
            reasons.append("✓ Age is close to preferred range")
        else:
            negatives.append("✗ Age outside preferred range")

        # 2. Community & Caste (20 Points)
        c_score = 0
        pref_comms = getattr(pref, 'preferred_communities', '')
        if pref_comms:
            allowed_ids = [int(x) for x in pref_comms.split(',') if x.strip().isdigit()]
            if other_profile.community_id in allowed_ids:
                c_score += 10
                reasons.append("✓ Preferred community matched")
            else:
                negatives.append("✗ Community mismatch")
        elif other_profile.community_id == profile.community_id:
            c_score += 10
            reasons.append("✓ Same community matched")
        else:
            c_score += 5
            reasons.append("✓ Different community within hierarchy")

        pref_caste = getattr(pref, 'caste', '').strip().lower()
        cand_caste = getattr(other_profile, 'caste', '').strip().lower()
        if not pref_caste or pref_caste == 'any':
            c_score += 10
            reasons.append("✓ Caste accepted (Any)")
        elif pref_caste in cand_caste or cand_caste in pref_caste:
            c_score += 10
            reasons.append("✓ Caste matched")
        else:
            negatives.append("✗ Caste mismatch")
        breakdown["community_caste"] = c_score

        # 3. Marital Status (10 Points)
        pref_ms = getattr(pref, 'marital_status', '').strip().lower()
        cand_ms = getattr(other_profile, 'marital_status', '').strip().lower()
        if not pref_ms or pref_ms == 'any':
            breakdown["marital_status"] = 10
            reasons.append("✓ Marital status accepted (Any)")
        elif pref_ms in cand_ms or cand_ms in pref_ms:
            breakdown["marital_status"] = 10
            reasons.append("✓ Marital status matched")
        else:
            negatives.append("✗ Marital status mismatch")

        # 4. Education (10 Points)
        pref_edu = getattr(pref, 'education', '').strip().lower()
        cand_edu = getattr(other_profile, 'education', '').strip().lower()
        if not pref_edu:
            breakdown["education"] = 10
            reasons.append("✓ Education level accepted (Any)")
        elif pref_edu in cand_edu or cand_edu in pref_edu:
            breakdown["education"] = 10
            reasons.append("✓ Education level matched")
        elif any(w in cand_edu for w in ['graduate', 'post graduate', 'mba', 'ca', 'engg', 'btech', 'degree']):
            breakdown["education"] = 7
            reasons.append("✓ Higher education qualification matched")
        else:
            negatives.append("✗ Education mismatch")

        # 5. Occupation (10 Points)
        pref_occ = getattr(pref, 'occupation', '').strip().lower()
        cand_occ = getattr(other_profile, 'profession', '').strip().lower()
        if not pref_occ:
            breakdown["occupation"] = 10
            reasons.append("✓ Occupation accepted (Any)")
        elif pref_occ in cand_occ or cand_occ in pref_occ:
            breakdown["occupation"] = 10
            reasons.append("✓ Occupation matched")
        else:
            breakdown["occupation"] = 5
            negatives.append("✗ Occupation mismatch")

        # 6. Location (10 Points)
        l_score = 0
        pref_country = getattr(pref, 'country', '').strip().lower()
        pref_state = getattr(pref, 'state', '').strip().lower()
        pref_city = getattr(pref, 'city', '').strip().lower()

        cand_country = getattr(other_profile, 'country', '').strip().lower()
        cand_state = getattr(other_profile, 'state', '').strip().lower()
        cand_city = getattr(other_profile, 'city', '').strip().lower()

        if not pref_country or pref_country == cand_country:
            l_score += 3
        if not pref_state or pref_state in cand_state or cand_state in pref_state:
            l_score += 3
        if not pref_city or pref_city in cand_city or cand_city in pref_city:
            l_score += 4

        if l_score == 10:
            reasons.append("✓ Exact location matched")
        elif l_score >= 6:
            reasons.append("✓ Country & State matched")
        else:
            negatives.append("✗ Location outside preferred area")
        breakdown["location"] = l_score

        # 7. Lifestyle (10 Points)
        lf_score = 0
        pref_diet = getattr(pref, 'diet', '').strip().lower()
        cand_diet = getattr(other_profile, 'diet', '').strip().lower()
        if not pref_diet or pref_diet == cand_diet or pref_diet == 'any':
            lf_score += 4
            reasons.append("✓ Diet preference matched")
        else:
            negatives.append("✗ Diet mismatch")

        pref_smoke = getattr(pref, 'smoking', '').strip().lower()
        cand_smoke = getattr(other_profile, 'smoking', '').strip().lower()
        if not pref_smoke or pref_smoke == cand_smoke or pref_smoke == 'any':
            lf_score += 3
            reasons.append("✓ Smoking preference matched")
        else:
            negatives.append("✗ Smoking preference mismatch")

        pref_drink = getattr(pref, 'drinking', '').strip().lower()
        cand_drink = getattr(other_profile, 'drinking', '').strip().lower()
        if not pref_drink or pref_drink == cand_drink or pref_drink == 'any':
            lf_score += 3
            reasons.append("✓ Drinking preference matched")
        else:
            negatives.append("✗ Drinking preference mismatch")
        breakdown["lifestyle"] = lf_score

        # 8. Religion (5 Points)
        pref_rel = getattr(pref, 'religion', '').strip().lower()
        cand_rel = getattr(other_profile, 'religion', '').strip().lower()
        if not pref_rel or pref_rel == cand_rel or pref_rel == 'any':
            breakdown["religion"] = 5
            reasons.append("✓ Religion matched")
        else:
            negatives.append("✗ Religion mismatch")

        # 9. Income (5 Points)
        pref_inc = getattr(pref, 'income_range', '').strip().lower()
        cand_inc = getattr(other_profile, 'income', '').strip().lower()
        if not pref_inc or pref_inc == 'any' or pref_inc in cand_inc or cand_inc in pref_inc:
            breakdown["income"] = 5
            reasons.append("✓ Income range matched")
        else:
            breakdown["income"] = 2
            negatives.append("✗ Income range mismatch")

        # Calculate final sum
        total_score = sum(breakdown.values())
        
        # Verified & Photo boosts/deductions
        pref_verified = getattr(pref, 'profile_verified_only', False)
        if pref_verified and not other_profile.is_verified:
            total_score = max(0, total_score - 15)
            negatives.append("✗ Profile is not verified")

        pref_photo = getattr(pref, 'photo_required', False)
        has_photo = other_profile.photos.exists() or bool(other_profile.photo)
        if pref_photo and not has_photo:
            total_score = max(0, total_score - 15)
            negatives.append("✗ Profile has no photo uploaded")

        final_score = min(max(total_score, 0), 100)

        return {
            "score": final_score,
            "breakdown": breakdown,
            "reasons": reasons,
            "negatives": negatives
        }
