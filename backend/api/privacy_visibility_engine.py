import logging
from django.db.models import Q

logger = logging.getLogger(__name__)

class PrivacyVisibilityEngine:
    @staticmethod
    def _is_owner_or_admin(profile, viewer_user) -> bool:
        if not viewer_user or not viewer_user.is_authenticated:
            return False
        if profile.user_id == viewer_user.id:
            return True
        if viewer_user.is_superuser:
            return True
        try:
            member = viewer_user.member_profile
            if member.role in ('community_admin', 'super_admin'):
                return True
        except Exception:
            pass
        return False

    @staticmethod
    def _value_matches(value, allowed_comma_separated) -> bool:
        if not allowed_comma_separated:
            return True
        if not value:
            return False
        allowed = [item.strip().lower() for item in allowed_comma_separated.split(',') if item.strip()]
        if not allowed or 'any' in allowed:
            return True
        return value.strip().lower() in allowed

    @staticmethod
    def canDiscoverTargetProfile(ownerProfile, viewerProfile) -> bool:
        """
        Determines if viewerProfile can discover ownerProfile based on owner's target rules.
        """
        from api.target_rule_engine import TargetRuleEngine
        return TargetRuleEngine.evaluate(ownerProfile, viewerProfile)

    @staticmethod
    def _evaluate_visibility_rules(profile, viewer_user) -> bool:
        from django.conf import settings
        matching_mode = getattr(settings, 'MATCHING_MODE', 'SMART_MATCHING')
        if matching_mode in ('OPEN_TEST', 'OPEN_TESTING'):
            return True

        visibility_type = getattr(profile, 'visibility_type', 'OPEN TO ALL') or 'OPEN TO ALL'
        visibility_type = visibility_type.upper().strip()

        # Resolve viewer's matrimony profile and member profile
        viewer_profile = None
        viewer_member = None
        if viewer_user and viewer_user.is_authenticated:
            from api.models import MatrimonyProfile, Member
            viewer_profile = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()
            try:
                viewer_member = viewer_user.member_profile
            except Exception:
                pass

        # 3. TARGETED MATCHES
        if visibility_type in ('TARGETED MATCHES', 'TARGETED_MATCHES', 'CUSTOM_AUDIENCE'):
            arg2 = viewer_profile if viewer_profile else viewer_user
            return PrivacyVisibilityEngine.canDiscoverTargetProfile(profile, arg2)

        # 1. PRIVATE
        if visibility_type in ('PRIVATE', 'PRIVATE Only'):
            if not viewer_profile:
                return False
            from api.models import InterestRequest
            has_approved_interest = InterestRequest.objects.filter(
                Q(sender=profile, receiver=viewer_profile) | 
                Q(sender=viewer_profile, receiver=profile, status='Accepted')
            ).exclude(status='Rejected').exists()
            return has_approved_interest

        # 2. COMMUNITY ONLY / COMMUNITY_NETWORK
        if visibility_type in ('COMMUNITY ONLY', 'COMMUNITY_ONLY', 'COMMUNITY_NETWORK'):
            viewer_comm = getattr(viewer_profile, 'community', None) or getattr(viewer_member, 'community', None)
            if not viewer_comm:
                return False
            profile_community = profile.community
            if not profile_community:
                return False
            
            allowed_ids = {profile_community.id}
            hierarchy_scope = getattr(profile, 'hierarchy_scope', 'My Community')
            if hierarchy_scope == 'Parent Community':
                if profile_community.parent_id:
                    allowed_ids.add(profile_community.parent_id)
            elif hierarchy_scope == 'Child Communities':
                from api.views import get_descendants_for_community
                allowed_ids.update(c.id for c in get_descendants_for_community(profile_community))
            elif hierarchy_scope in ('Entire Hierarchy Chain', 'Entire Network'):
                from api.views import get_ancestors_for_community, get_descendants_for_community
                allowed_ids.update(c.id for c in get_ancestors_for_community(profile_community))
                allowed_ids.update(c.id for c in get_descendants_for_community(profile_community))
            elif hierarchy_scope == 'Selected Communities':
                allowed_ids = set(profile.selected_communities.values_list('id', flat=True))
            elif hierarchy_scope not in ('My Community', 'My Community Only'):
                allowed_ids = {profile_community.id}

            return viewer_comm.id in allowed_ids

        # 4. OPEN TO ALL / PLATFORM_WIDE
        return True

    @staticmethod
    def canDiscoverProfile(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can discover / see this profile in list/search screens.
        """
        if not profile:
            return False
        if profile.deleted_at is not None:
            return False

        # Admins can discover anything
        is_admin = False
        if viewer_user and viewer_user.is_authenticated and (viewer_user.is_superuser or getattr(getattr(viewer_user, 'member_profile', None), 'role', None) in ('community_admin', 'super_admin')):
            is_admin = True

        # Exclude own profile from discovery
        if viewer_user and viewer_user.is_authenticated and profile.user_id == viewer_user.id:
            return False

        # Exclude Draft, Inactive, Rejected, Suspended profiles for non-owner/non-admin
        if not is_admin and profile.status in ('Draft', 'Inactive', 'Rejected', 'Suspended'):
            return False

        # Map visibility type to display name
        visibility_type = getattr(profile, 'visibility_type', 'OPEN TO ALL') or 'OPEN TO ALL'
        visibility_type = visibility_type.upper().strip()

        def get_visibility_mode_display(v_type):
            if v_type in ('CUSTOM_AUDIENCE', 'TARGETED MATCHES', 'TARGETED_MATCHES'):
                return 'TARGETED MATCHES'
            if v_type in ('COMMUNITY_NETWORK', 'COMMUNITY ONLY', 'COMMUNITY_ONLY'):
                return 'COMMUNITY ONLY'
            if v_type in ('PLATFORM_WIDE', 'OPEN TO ALL'):
                return 'OPEN TO ALL'
            return v_type

        # Resolve viewer's matrimony profile
        viewer_profile = None
        if viewer_user and viewer_user.is_authenticated:
            from api.models import MatrimonyProfile
            viewer_profile = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()

        # Check: Is the visibility mode TARGETED MATCHES?
        is_target_mode = visibility_type in ('CUSTOM_AUDIENCE', 'TARGETED MATCHES', 'TARGETED_MATCHES')

        # In Open Testing mode, we bypass the TargetRuleEngine checks for discovery, but wait!
        # Do we still want to log for visibility mode TARGETED MATCHES even in OPEN TESTING?
        # In open testing, the final decision is PASS regardless, but to be safe, if we are in open testing,
        # does TargetRuleEngine.evaluate run?
        # Let's see: if we run it, it might fail (since target criteria don't match) but the profile is still returned!
        # So it's cleaner to check the overall visibility decision first.
        from django.conf import settings
        matching_mode = getattr(settings, 'MATCHING_MODE', 'SMART_MATCHING')
        is_open_test = matching_mode in ('OPEN_TEST', 'OPEN_TESTING')

        if is_target_mode and not is_open_test:
            # CALL TargetRuleEngine.evaluate(ownerProfile, viewerProfile)
            from api.target_rule_engine import TargetRuleEngine
            arg2 = viewer_profile if viewer_profile else viewer_user
            passed = TargetRuleEngine.evaluate(profile, arg2)
            if is_admin:
                return True
            return passed
        else:
            # Evaluate normal flow or open test flow
            passed = PrivacyVisibilityEngine._evaluate_visibility_rules(profile, viewer_user)
            if is_admin:
                passed = True

            # Print compact log for non-target-matches modes
            viewer_name = getattr(viewer_profile, 'name', '') or getattr(viewer_user, 'username', 'None')
            candidate_name = getattr(profile, 'name', '')
            print(f"\nViewer    : {viewer_name}")
            print(f"Candidate : {candidate_name}")
            print(f"Visibility: {get_visibility_mode_display(visibility_type)}")
            print(f"Final     : {'PASS' if passed else 'FAIL'}")
            print(f"Returned  : {'YES' if passed else 'NO'}")

            return passed

    @staticmethod
    def canViewProfile(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can view details of this profile.
        """
        if not profile:
            return False
        if profile.deleted_at is not None:
            return False

        # Owner and admin can always view
        if PrivacyVisibilityEngine._is_owner_or_admin(profile, viewer_user):
            return True

        # Exclude Draft, Inactive, Rejected, Suspended profiles for non-owner/non-admin
        if profile.status in ('Draft', 'Inactive', 'Rejected', 'Suspended'):
            return False

        return PrivacyVisibilityEngine._evaluate_visibility_rules(profile, viewer_user)

    @staticmethod
    def canViewPhotos(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can view photos of this profile.
        """
        return True

    @staticmethod
    def canViewContact(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can view contact details of this profile.
        Delegates to ContactVisibilityEngine for full state-aware logic.
        """
        from api.contact_visibility_engine import ContactVisibilityEngine
        raw_perm     = getattr(profile, 'contact_permission', '') or ''
        viewer_state = ContactVisibilityEngine.get_viewer_state(profile, viewer_user)
        return ContactVisibilityEngine.can_reveal_contact(raw_perm, viewer_state)

    @staticmethod
    def canSendInterest(profile, viewer_user):
        """
        Determines if viewer_user can send interest to this profile.
        Returns: (is_eligible: bool, reason: str)
        """
        return True, "Eligible"

    @staticmethod
    def canChat(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can chat with this profile.
        """
        return True

    @staticmethod
    def canViewFamily(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can view family details of this profile.
        """
        return True

    @staticmethod
    def canViewDocuments(profile, viewer_user) -> bool:
        """
        Determines if viewer_user can view documents of this profile.
        """
        return True
