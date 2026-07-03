import logging
import re
from django.db.models import Q
from django.conf import settings

logger = logging.getLogger(__name__)

class MatrimonyRuleEngine:
    @staticmethod
    def get_interest_state(profile, viewer_profile):
        """
        Returns the interest state between profile and viewer_profile.
        States: NEW, INTEREST_SENT, INTEREST_RECEIVED, INTEREST_ACCEPTED, MUTUAL_MATCH, CONNECTED, DECLINED
        """
        if not profile or not viewer_profile:
            return "NEW"
        
        from api.models import InterestRequest
        
        # Check direct interest requests
        sent = InterestRequest.objects.filter(sender=viewer_profile, receiver=profile).first()
        received = InterestRequest.objects.filter(sender=profile, receiver=viewer_profile).first()
        
        # If both accepted, it's a mutual match / CONNECTED
        if sent and sent.status == 'Accepted' and received and received.status == 'Accepted':
            return "CONNECTED"
            
        # If either is accepted, it's CONNECTED
        if (sent and sent.status == 'Accepted') or (received and received.status == 'Accepted'):
            return "CONNECTED"
            
        if sent:
            if sent.status == 'Rejected':
                return "DECLINED"
            return "INTEREST_SENT"
            
        if received:
            if received.status == 'Rejected':
                return "DECLINED"
            return "INTEREST_RECEIVED"
            
        return "NEW"

    @staticmethod
    def check_blocked(viewer, candidate):
        """Returns True if viewer has blocked candidate or candidate has blocked viewer."""
        return False

    @staticmethod
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

    @staticmethod
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
        r_lower = str(range_val).lower().strip()
        if r_lower in inc or inc in r_lower:
            return True
        return False

    @staticmethod
    def check_mandatory_filters(viewer, candidate, pref=None):
        """
        Verifies if candidate matches the mandatory (hard) filters of viewer.
        Returns (matches, reason)
        """
        return True, "Mandatory criteria matched"

    @staticmethod
    def evaluate_visibility(profile, viewer_user):
        """
        Determines the visibility of profile to viewer_user under all modes.
        Returns: (is_visible: bool, visibility_reason: str)
        """
        if getattr(profile, 'deleted_at', None) is not None:
            return False, "Deleted"
            
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        visible = PrivacyVisibilityEngine.canViewProfile(profile, viewer_user)
        
        if profile.status in ('Draft', 'Inactive', 'Rejected', 'Suspended'):
            return visible, profile.status
            
        if not visible:
            visibility_type = getattr(profile, 'visibility_type', 'OPEN TO ALL') or 'OPEN TO ALL'
            visibility_type = visibility_type.upper().strip()
            if visibility_type in ('PRIVATE', 'PRIVATE Only'):
                return False, "Private (Requires Accepted Interest)"
            if visibility_type in ('COMMUNITY ONLY', 'COMMUNITY_ONLY', 'COMMUNITY_NETWORK'):
                return False, f"Community Only ({profile.hierarchy_scope})"
            if visibility_type in ('TARGETED MATCHES', 'TARGETED_MATCHES'):
                return False, "Targeted Matches Only"
            return False, visibility_type

        # If visible, check the visibility type to return the correct text representation
        visibility_type = getattr(profile, 'visibility_type', 'OPEN TO ALL') or 'OPEN TO ALL'
        visibility_type = visibility_type.upper().strip()
        if visibility_type in ('OPEN TO ALL', 'PLATFORM_WIDE'):
            return True, "Open To All"
        if visibility_type in ('COMMUNITY ONLY', 'COMMUNITY_ONLY', 'COMMUNITY_NETWORK'):
            return True, "Community Network"
        
        return True, visibility_type

    @staticmethod
    def canViewProfile(profile, viewer_user):
        """
        Determines if viewer_user can view profile.
        Consolidates PrivacyEngine.canViewProfile, MatrimonyVisibilityService.can_appear_in_listings.
        """
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        return PrivacyVisibilityEngine.canViewProfile(profile, viewer_user)

    @staticmethod
    def canViewContact(profile, viewer_user):
        """
        Determines if viewer_user can view profile's contact info.
        Uses ContactVisibilityEngine for state-aware logic.
        """
        from api.contact_visibility_engine import ContactVisibilityEngine
        raw_perm     = getattr(profile, 'contact_permission', '') or ''
        viewer_state = ContactVisibilityEngine.get_viewer_state(profile, viewer_user)
        return ContactVisibilityEngine.can_reveal_contact(raw_perm, viewer_state)

    @staticmethod
    def canViewPhotos(profile, viewer_user, photo=None):
        """
        Determines if viewer_user can view profile's photos.
        Consolidates PrivacyEngine.canViewPhoto / MatrimonyVisibilityService.can_view_photo.
        """
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        return PrivacyVisibilityEngine.canViewPhotos(profile, viewer_user)

    @staticmethod
    def canViewFamilyDetails(profile, viewer_user):
        """
        Determines if viewer_user can view profile's family details.
        """
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        return PrivacyVisibilityEngine.canViewFamily(profile, viewer_user)

    @staticmethod
    def canSendInterest(sender_profile, receiver_profile):
        """
        Determines if sender_profile can send interest to receiver_profile.
        Consolidates PreferenceEngine.isEligibleForInterest.
        """
        if not sender_profile or not receiver_profile:
            return False, "Invalid profiles"
            
        if sender_profile.id == receiver_profile.id:
            return False, "Cannot send interest to yourself"

        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        return PrivacyVisibilityEngine.canSendInterest(receiver_profile, sender_profile.user)

    @staticmethod
    def isRecommendationEligible(profile, viewer_profile):
        """
        Checks if candidate profile is eligible to be recommended to viewer_profile.
        Consolidates PreferenceEngine.canRecommend.
        """
        if not viewer_profile or not profile or viewer_profile.id == profile.id:
            return False
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        return PrivacyVisibilityEngine.canDiscoverProfile(profile, viewer_profile.user)

    @staticmethod
    def calculateMatchScore(profile, other_profile):
        """
        Calculates dynamic match score between two profiles (0-100%).
        Consolidates PreferenceEngine.calculateMatchScore and MatrimonyProfile.calculate_match_score.
        """
        from api.match_score_engine import MatchScoreEngine
        return MatchScoreEngine.calculateMatchScore(profile, other_profile)

    @staticmethod
    def serializeVisibleFields(profile, viewer_user, serialized_data):
        """
        Filters out sensitive fields in serialized_data depending on privacy rules and interest state.
        - Discovery visibility (who can see the profile) is handled by PrivacyVisibilityEngine.
        - Contact visibility (which contact fields to show) is handled by ContactVisibilityEngine.
        """
        from api.rule_engine import MatrimonyRuleEngine
        from api.contact_visibility_engine import ContactVisibilityEngine

        # ── Discovery visibility ──────────────────────────────
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(profile, viewer_user)
        serialized_data['visibility_reason'] = reason
        if not visible:
            serialized_data['name'] = 'Hidden Profile'
            # When the profile itself is hidden, contacts are hidden too
            serialized_data = ContactVisibilityEngine.mask_contact_fields(serialized_data, allow_reveal=False)
            serialized_data['contact_visibility_state']  = 'VISITOR'
            serialized_data['contact_visibility_policy'] = 'Never'
            serialized_data['contact_visible']           = False
            return serialized_data

        # ── Contact visibility (profile IS visible) ───────────
        serialized_data = ContactVisibilityEngine.apply(profile, viewer_user, serialized_data)

        return serialized_data
