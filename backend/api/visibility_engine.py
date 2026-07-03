import logging
from api.privacy_visibility_engine import PrivacyVisibilityEngine
from api.rule_engine import MatrimonyRuleEngine

logger = logging.getLogger(__name__)

class MatrimonyVisibilityService:
    @staticmethod
    def get_interest_state(profile, viewer_profile):
        return MatrimonyRuleEngine.get_interest_state(profile, viewer_profile)

    @staticmethod
    def can_appear_in_listings(profile, viewer_user):
        return PrivacyVisibilityEngine.canDiscoverProfile(profile, viewer_user)

    @staticmethod
    def check_field_visibility(profile, viewer_user, field_category):
        if field_category in ('phone', 'email', 'whatsapp'):
            return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)
        if field_category in ('guardian', 'family', 'address'):
            return PrivacyVisibilityEngine.canViewFamily(profile, viewer_user)
        return True

    @staticmethod
    def can_view_photo(photo, viewer_user):
        return PrivacyVisibilityEngine.canViewPhotos(photo.profile, viewer_user)

    @staticmethod
    def canViewPhotos(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewPhotos(profile, viewer_user)


class PrivacyEngine:
    @staticmethod
    def canViewProfile(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewProfile(profile, viewer_user)

    @staticmethod
    def canViewPhoto(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewPhotos(profile, viewer_user)

    @staticmethod
    def canViewContact(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)

    @staticmethod
    def canViewEmail(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)

    @staticmethod
    def canViewWhatsapp(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)

    @staticmethod
    def canViewPhone(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)

    @staticmethod
    def canViewFamilyDetails(profile, viewer_user) -> bool:
        return PrivacyVisibilityEngine.canViewFamily(profile, viewer_user)


class MatrimonyPrivacyEngine:
    @staticmethod
    def canView(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewProfile(profile, viewer_user)

    @staticmethod
    def canContact(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)

    @staticmethod
    def canViewPhotos(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewPhotos(profile, viewer_user)

    @staticmethod
    def canViewFamily(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewFamily(profile, viewer_user)

    @staticmethod
    def canViewPhone(profile, viewer_user):
        return PrivacyVisibilityEngine.canViewContact(profile, viewer_user)
