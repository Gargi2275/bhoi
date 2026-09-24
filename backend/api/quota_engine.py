import os
from django.conf import settings
from rest_framework.exceptions import ValidationError as DRFValidationError

def get_community_quota_limit(community, quota_code):
    subscription = getattr(community, 'subscription', None)
    if not subscription:
        return 0
    
    plan = subscription.plan
    if not plan:
        return 0
    
    # Get plan's base limit for this quota.
    base_limit = getattr(plan, quota_code, 0)
    
    # Add active add-ons increments
    active_addons = community.addons.filter(status='Active', addon__target_limit__code=quota_code)
    addon_increment = sum(item.addon.increment * item.quantity for item in active_addons)
    
    # Check limits_override
    override = subscription.limits_override.get(quota_code)
    if override is not None:
        try:
            return int(override) + addon_increment
        except ValueError:
            pass
            
    return base_limit + addon_increment

def get_community_storage_used_bytes(community):
    total_bytes = 0
    
    # 1. Gallery
    from api.models import Gallery
    for item in Gallery.objects.filter(community=community):
        if item.image and item.image.name:
            try:
                total_bytes += item.image.size
            except Exception:
                pass
                
    # 2. Committee
    from api.models import Committee
    for item in Committee.objects.filter(community=community):
        if item.photo and item.photo.name:
            try:
                total_bytes += item.photo.size
            except Exception:
                pass
                
    # 3. Member
    from api.models import Member
    for item in Member.objects.filter(community=community):
        if item.avatar and item.avatar.name:
            try:
                total_bytes += item.avatar.size
            except Exception:
                pass
                
    # 4. Event
    from api.models import Event
    for item in Event.objects.filter(community=community):
        if item.img and item.img.name:
            try:
                total_bytes += item.img.size
            except Exception:
                pass
                
    # 5. News
    from api.models import News
    for item in News.objects.filter(community=community):
        if item.img and item.img.name:
            try:
                total_bytes += item.img.size
            except Exception:
                pass

    # 6. BookingProperty
    from api.models import BookingProperty
    for item in BookingProperty.objects.filter(community=community):
        if item.brochure_pdf and item.brochure_pdf.name:
            try:
                total_bytes += item.brochure_pdf.size
            except Exception:
                pass

    return total_bytes

def check_quota_limit(community, quota_code, additional_increment=1):
    if not community:
        return
        
    limit = get_community_quota_limit(community, quota_code)
    if limit <= 0:
        return
        
    # Get current count based on quota_code
    if quota_code == "max_members":
        from api.models import Member
        current_val = Member.objects.filter(community=community).count()
        error_msg = "Your membership limit has been reached."
    elif quota_code == "max_family_members":
        from api.models import Family
        current_val = Family.objects.filter(community=community).count()
        error_msg = "Your family membership limit has been reached."
    elif quota_code == "max_committee_members":
        from api.models import Committee
        current_val = Committee.objects.filter(community=community).count()
        error_msg = "Your committee membership limit has been reached."
    elif quota_code == "max_communities":
        from api.models import Community
        current_val = Community.objects.filter(parent=community).count()
        error_msg = "Your sub-community limit has been reached."
    else:
        return
        
    if current_val + additional_increment > limit:
        raise DRFValidationError(error_msg)

def check_storage_quota(community, new_file_size=0):
    if not community:
        return
    limit_gb = get_community_quota_limit(community, "max_storage_gb")
    if limit_gb <= 0:
        return
        
    used_bytes = get_community_storage_used_bytes(community)
    limit_bytes = limit_gb * 1024 * 1024 * 1024
    if used_bytes + new_file_size > limit_bytes:
        raise DRFValidationError("Your storage limit has been reached.")
