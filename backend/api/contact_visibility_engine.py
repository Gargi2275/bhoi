"""
ContactVisibilityEngine
=======================
Single source of truth for contact field visibility.

Contact Permission Options (stored in MatrimonyProfile.contact_permission):
  - "Never"                  → Never reveal to anyone except the owner
  - "After Interest Approval"→ Reveal once the owner has accepted the viewer's interest
                               OR the viewer has accepted the owner's interest
  - "After Mutual Interest"  → Reveal only after BOTH sides have accepted each other
  - "Immediately"            → Reveal to every authenticated visitor who can view the profile

Viewer States (derived from InterestRequest records):
  - OWNER      → viewer is the profile owner (always sees full contact)
  - BLOCKED    → one party has blocked the other (never sees contact)
  - MUTUAL     → both parties have accepted each other's interest
  - APPROVED   → one side has accepted (at least one Accepted record exists)
  - INTERESTED → viewer has sent an interest that is still Pending
  - VISITOR    → no interest relationship at all

Contact Fields Masked When Hidden:
  phone, whatsapp, email (own + contact_* guardian fields), current_address,
  contact_name, contact_relation, contact_phone, contact_whatsapp, contact_email

Profile is NEVER removed — only these fields are nulled.
"""

import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────
# Canonical permission values (normalise on read)
# ──────────────────────────────────────────────────────────
NEVER               = "Never"
AFTER_APPROVAL      = "After Interest Approval"
AFTER_MUTUAL        = "After Mutual Interest"
IMMEDIATELY         = "Immediately"

# Aliases the frontend / old code might send
_PERMISSION_ALIASES = {
    # exact matches
    NEVER: NEVER,
    AFTER_APPROVAL: AFTER_APPROVAL,
    AFTER_MUTUAL: AFTER_MUTUAL,
    IMMEDIATELY: IMMEDIATELY,
    # legacy / alternate labels
    "Never Share":              NEVER,
    "never":                    NEVER,
    "never share":              NEVER,
    "after interest approval":  AFTER_APPROVAL,
    "After Interest":           AFTER_APPROVAL,
    "after approval":           AFTER_APPROVAL,
    "After Mutual":             AFTER_MUTUAL,
    "after mutual interest":    AFTER_MUTUAL,
    "mutual":                   AFTER_MUTUAL,
    "immediately":              IMMEDIATELY,
    "Immediately (All Viewers)": IMMEDIATELY,
    "Everyone Who Can View":    IMMEDIATELY,
    "everyone":                 IMMEDIATELY,
    "public":                   IMMEDIATELY,
    # After Family Approval — treat same as AFTER_APPROVAL for now
    "After Family Approval":    AFTER_APPROVAL,
}

# ──────────────────────────────────────────────────────────
# Contact fields that are masked when hidden
# ──────────────────────────────────────────────────────────
CONTACT_FIELDS = [
    "contact_name",
    "contact_relation",
    "contact_phone",
    "contact_whatsapp",
    "contact_email",
    "allow_phone",
    "allow_whatsapp",
    "allow_email",
    "current_address",
]

# ──────────────────────────────────────────────────────────
# Viewer States
# ──────────────────────────────────────────────────────────
STATE_OWNER      = "OWNER"
STATE_BLOCKED    = "BLOCKED"
STATE_MUTUAL     = "MUTUAL"
STATE_APPROVED   = "APPROVED"     # one side accepted
STATE_INTERESTED = "INTERESTED"   # viewer sent pending interest
STATE_VISITOR    = "VISITOR"      # no relationship


class ContactVisibilityEngine:

    # ── 1. Normalise the stored permission string ──────────
    @staticmethod
    def normalise_permission(raw_value: str) -> str:
        if not raw_value:
            return IMMEDIATELY          # safest visible default
        cleaned = str(raw_value).strip()
        return _PERMISSION_ALIASES.get(cleaned, IMMEDIATELY)

    # ── 2. Resolve viewer state from DB ───────────────────
    @staticmethod
    def get_viewer_state(profile, viewer_user) -> str:
        """
        Returns the relationship state between viewer_user and profile.
        Queries InterestRequest once.
        """
        if not viewer_user or not getattr(viewer_user, 'is_authenticated', False):
            return STATE_VISITOR

        # Owner always has full access
        if getattr(profile, 'user_id', None) == viewer_user.id:
            return STATE_OWNER

        # Blocked check (extend here if you add a Block model later)
        # For now, no block model exists — skip.

        from api.models import MatrimonyProfile, InterestRequest
        from django.db.models import Q

        # Resolve viewer's matrimony profile
        viewer_profile = MatrimonyProfile.objects.filter(
            user=viewer_user, deleted_at__isnull=True
        ).first()

        if not viewer_profile:
            return STATE_VISITOR

        # Load all interest records between the two profiles (max 2 rows)
        requests = InterestRequest.objects.filter(
            Q(sender=profile,        receiver=viewer_profile) |
            Q(sender=viewer_profile, receiver=profile)
        ).select_related()

        sent_by_viewer     = None   # viewer → profile
        sent_by_owner      = None   # profile → viewer

        for req in requests:
            if req.sender_id == viewer_profile.id:
                sent_by_viewer = req
            else:
                sent_by_owner = req

        viewer_accepted = sent_by_viewer and sent_by_viewer.status == 'Accepted'
        owner_accepted  = sent_by_owner  and sent_by_owner.status  == 'Accepted'

        if viewer_accepted and owner_accepted:
            return STATE_MUTUAL

        if viewer_accepted or owner_accepted:
            return STATE_APPROVED

        # Pending interest from viewer
        if sent_by_viewer and sent_by_viewer.status == 'Pending':
            return STATE_INTERESTED

        return STATE_VISITOR

    # ── 3. Pure logic: can this state reveal contacts? ────
    @staticmethod
    def can_reveal_contact(contact_permission: str, viewer_state: str) -> bool:
        """
        Pure function — no DB access.
        Returns True if viewer_state satisfies contact_permission.
        """
        perm = ContactVisibilityEngine.normalise_permission(contact_permission)

        # Owner always sees everything
        if viewer_state == STATE_OWNER:
            return True

        # Blocked never sees contact
        if viewer_state == STATE_BLOCKED:
            return False

        if perm == NEVER:
            return False

        if perm == IMMEDIATELY:
            return True

        if perm == AFTER_APPROVAL:
            # APPROVED, MUTUAL both qualify
            return viewer_state in (STATE_APPROVED, STATE_MUTUAL)

        if perm == AFTER_MUTUAL:
            return viewer_state == STATE_MUTUAL

        # Unknown permission — default hide
        return False

    # ── 4. Mask contact fields in serialized dict ─────────
    @staticmethod
    def mask_contact_fields(data: dict, allow_reveal: bool) -> dict:
        """
        If allow_reveal is False, nulls out all contact fields.
        Never removes any key — always sets to None / False.
        Adds a 'contact_visibility_state' key for the frontend to display a hint.
        """
        if not allow_reveal:
            for field in CONTACT_FIELDS:
                if field in data:
                    if isinstance(data[field], bool):
                        data[field] = False
                    else:
                        data[field] = None
        return data

    # ── 5. High-level entry point ─────────────────────────
    @staticmethod
    def apply(profile, viewer_user, serialized_data: dict) -> dict:
        """
        Called from serializeVisibleFields.
        Determines whether contact fields should be revealed and masks them if not.
        Also injects:
          - contact_visibility_state  : viewer's relationship state (e.g. "VISITOR")
          - contact_visibility_policy : normalised permission label (e.g. "After Mutual Interest")
          - contact_visible           : bool — whether contacts are shown
        """
        viewer_state  = ContactVisibilityEngine.get_viewer_state(profile, viewer_user)
        raw_perm      = getattr(profile, 'contact_permission', '') or ''
        perm          = ContactVisibilityEngine.normalise_permission(raw_perm)
        allow_reveal  = ContactVisibilityEngine.can_reveal_contact(perm, viewer_state)

        # Inject meta fields for the frontend
        serialized_data['contact_visibility_state']  = viewer_state
        serialized_data['contact_visibility_policy'] = perm
        serialized_data['contact_visible']           = allow_reveal

        # Mask if needed
        ContactVisibilityEngine.mask_contact_fields(serialized_data, allow_reveal)

        # Terminal log (same compact style as TargetRuleEngine)
        viewer_name    = getattr(viewer_user, 'username', 'anon') if viewer_user else 'anon'
        candidate_name = getattr(profile, 'name', '')
        print(f"\nViewer    : {viewer_name}")
        print(f"Candidate : {candidate_name}")
        print(f"Contact   : policy={perm} | state={viewer_state} | reveal={'YES' if allow_reveal else 'NO'}")

        return serialized_data
