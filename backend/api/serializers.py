from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Community, Member, Committee, Event, Job,
    Business, MatrimonyProfile, Campaign, Donation,
    News, Family, FamilyMember, EventRegistration,
    CommunityApprovalHistory, Notification, SubscriptionPlan, Role, Advertisement,
    Gallery, PartnerPreference, ProfileVisibility, InterestRequest, Wishlist, ProfileView,
    MatrimonyPhoto, MatrimonyAuditLog, JobApplication,
    FeatureMaster, PlanFeaturePermission, CommunitySubscription, ModulePermissionDefinition,
    SubscriptionHistory, PlanAddon, FeatureUsage, SubscriptionAuditLog, SystemQuota,
    ApplicationModule, ApplicationAction, ModuleAction, ApplicationModuleAuditLog,
    MemberPremiumPlan, MemberPremiumFeature, MemberPremiumBenefit,
    MemberPremiumAddon, MemberPremiumCoupon, MemberPremiumSubscription,
    MemberFeatureUsage, MemberPremiumTransaction, MemberPremiumInvoice,
    MemberAddonPurchase, MemberPremiumAuditLog,
    CommunityLicense, CommunityModuleAccess, CommunityUsage, CommunityBilling,
    CommunityInvoice, CommunityTransaction, CommunityAddon, CommunityAuditLog,
    MemberPremiumReward, MemberPremiumSupportTicket
)

# UserSerializer is defined below to avoid duplicates

# Community Serializer
class CommunitySerializer(serializers.ModelSerializer):
    # Writable ImageFields for file upload handling
    logo = serializers.ImageField(required=False, allow_null=True)
    cover = serializers.ImageField(required=False, allow_null=True)
    member_count = serializers.SerializerMethodField()
    events_count = serializers.SerializerMethodField()
    subsidiaries_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    committee_count = serializers.SerializerMethodField()
    families_count = serializers.SerializerMethodField()
    businesses_count = serializers.SerializerMethodField()
    donations_count = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    approval_history = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    admin_email = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    path = serializers.SerializerMethodField()
    ancestors = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        import time
        t = int(time.time())
        if instance.logo:
            try:
                url = f"{instance.logo.url}?t={t}"
                ret['logo'] = request.build_absolute_uri(url) if request else url
            except Exception:
                ret['logo'] = None
        else:
            ret['logo'] = f"{instance.logo_url}?t={t}" if instance.logo_url else None

        if instance.cover:
            try:
                url = f"{instance.cover.url}?t={t}"
                ret['cover'] = request.build_absolute_uri(url) if request else url
            except Exception:
                ret['cover'] = None
        else:
            ret['cover'] = f"{instance.cover_url}?t={t}" if instance.cover_url else None
        return ret

    def get_member_count(self, obj):
        return obj.members.count()

    def get_subsidiaries_count(self, obj):
        return obj.subsidiaries.filter(status__in=['Approved', 'Active']).count()

    def get_children_count(self, obj):
        return obj.subsidiaries.count()

    def get_committee_count(self, obj):
        return obj.committee_members.count()

    def get_families_count(self, obj):
        return obj.families.count()

    def get_businesses_count(self, obj):
        return obj.businesses.count()

    def get_donations_count(self, obj):
        from .models import Donation
        return Donation.objects.filter(campaign__community=obj).count()

    def get_approval_history(self, obj):
        history = obj.approval_history.all().order_by('approved_date')
        return CommunityApprovalHistorySerializer(history, many=True).data
    
    def get_events_count(self, obj):
        return obj.events.count()

    def get_admin_name(self, obj):
        admin = obj.members.filter(role='community_admin').first()
        return admin.name if admin else None

    def get_admin_email(self, obj):
        admin = obj.members.filter(role='community_admin').first()
        return admin.email if admin else None

    def get_level(self, obj):
        return obj.level

    def get_path(self, obj):
        return obj.path

    def get_ancestors(self, obj):
        return obj.ancestors_list


# Member Serializer
class MemberSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    community_name = serializers.CharField(source='community.name', read_only=True)
    community_logo = serializers.SerializerMethodField()
    community_cover = serializers.SerializerMethodField()
    community_type = serializers.CharField(source='community.type', read_only=True)
    parent_community_name = serializers.SerializerMethodField()
    custom_role_name = serializers.CharField(source='custom_role.name', read_only=True)
    permissions = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        if obj.custom_role:
            role_perms = obj.custom_role.permissions if isinstance(obj.custom_role.permissions, list) else []
            member_perms = obj.permissions if isinstance(obj.permissions, list) else []
            return list(set(role_perms) & set(member_perms))
        return obj.permissions or []

    def get_community_logo(self, obj):
        if obj.community:
            import time
            t = int(time.time())
            request = self.context.get('request')
            if obj.community.logo:
                url = f"{obj.community.logo.url}?t={t}"
                return request.build_absolute_uri(url) if request else url
            if obj.community.logo_url:
                return f"{obj.community.logo_url}?t={t}"
        return None

    def get_community_cover(self, obj):
        if obj.community:
            import time
            t = int(time.time())
            request = self.context.get('request')
            if obj.community.cover:
                url = f"{obj.community.cover.url}?t={t}"
                return request.build_absolute_uri(url) if request else url
            if obj.community.cover_url:
                return f"{obj.community.cover_url}?t={t}"
        return None

    def get_parent_community_name(self, obj):
        if obj.community and obj.community.parent:
            return obj.community.parent.name
        return None

    class Meta:
        model = Member
        fields = '__all__'

    def update(self, instance, validated_data):
        name = validated_data.get('name')
        email = validated_data.get('email')
        user = instance.user
        if user:
            updated_user = False
            if name:
                parts = name.split(' ')
                user.first_name = parts[0]
                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                updated_user = True
            if email:
                user.email = email
                updated_user = True
            if updated_user:
                user.save()
        return super().update(instance, validated_data)

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return obj.avatar_url

# Committee Serializer
class CommitteeSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False, allow_null=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    role_id = serializers.IntegerField(source='role.id', read_only=True, allow_null=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Committee
        fields = '__all__'
    
    def get_permissions(self, obj):
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(email=obj.email)
            return user.member_profile.permissions if isinstance(user.member_profile.permissions, list) else []
        except Exception:
            return []
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.photo:
            request = self.context.get('request')
            if request:
                ret['photo'] = request.build_absolute_uri(instance.photo.url)
            else:
                ret['photo'] = f"http://localhost:8000{instance.photo.url}"
        else:
            ret['photo'] = instance.photo_url
        return ret

# Event Serializer
class EventSerializer(serializers.ModelSerializer):
    img = serializers.ImageField(required=False, allow_null=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    
    class Meta:
        model = Event
        fields = '__all__'
    
    def to_internal_value(self, data):
        # Copy to allow modification
        try:
            data = data.copy()
        except AttributeError:
            pass
            
        for field_name in ['speakers', 'schedule', 'gallery']:
            if field_name in data and isinstance(data[field_name], str):
                import json
                try:
                    data[field_name] = json.loads(data[field_name])
                except Exception:
                    pass
        return super().to_internal_value(data)
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.img:
            request = self.context.get('request')
            if request:
                ret['img'] = request.build_absolute_uri(instance.img.url)
            else:
                ret['img'] = f"http://localhost:8000{instance.img.url}"
        else:
            ret['img'] = instance.img_url
        return ret

# Job Serializer
class JobSerializer(serializers.ModelSerializer):
    community_name = serializers.CharField(source='community.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Job
        fields = '__all__'

# Job Application Serializer
class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.role', read_only=True)
    company_name = serializers.CharField(source='job.company', read_only=True)
    applicant_name = serializers.CharField(source='member.name', read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    resume = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = JobApplication
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure resume has absolute URL
        if instance.resume and hasattr(instance.resume, 'url'):
            request = self.context.get('request')
            if request:
                ret['resume'] = request.build_absolute_uri(instance.resume.url)
            else:
                ret['resume'] = f"http://localhost:8000{instance.resume.url}"
        return ret

# Business Serializer
class BusinessSerializer(serializers.ModelSerializer):
    img = serializers.ImageField(required=False, allow_null=True)
    cover = serializers.ImageField(required=False, allow_null=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    
    class Meta:
        model = Business
        fields = '__all__'
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        
        # Logo serialization
        if instance.img:
            if request:
                ret['img'] = request.build_absolute_uri(instance.img.url)
            else:
                ret['img'] = f"http://localhost:8000{instance.img.url}"
        else:
            ret['img'] = instance.img_url

        # Cover image serialization
        if instance.cover:
            if request:
                ret['cover'] = request.build_absolute_uri(instance.cover.url)
            else:
                ret['cover'] = f"http://localhost:8000{instance.cover.url}"
        else:
            ret['cover'] = instance.cover_url
            
        # Gallery serialization
        gallery = ret.get('gallery') or []
        if isinstance(gallery, list):
            serialized_gallery = []
            for item in gallery:
                if item and not (item.startswith('http://') or item.startswith('https://') or item.startswith('data:')):
                    url_path = item if item.startswith('/') else f"/{item}"
                    if request:
                        serialized_gallery.append(request.build_absolute_uri(url_path))
                    else:
                        serialized_gallery.append(f"http://localhost:8000{url_path}")
                else:
                    serialized_gallery.append(item)
            ret['gallery'] = serialized_gallery
            
        return ret

class MatrimonyPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    is_blurred = serializers.SerializerMethodField()
    
    class Meta:
        model = MatrimonyPhoto
        fields = '__all__'
        
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.image_url

    def get_is_blurred(self, obj):
        return False

class MatrimonyAuditLogSerializer(serializers.ModelSerializer):
    performed_by_username = serializers.CharField(source='performed_by.username', read_only=True)
    
    class Meta:
        model = MatrimonyAuditLog
        fields = '__all__'

# Matrimony Profile Serializer
class MatrimonyProfileSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    photos = MatrimonyPhotoSerializer(many=True, read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    family_member_name = serializers.CharField(source='family_member.name', read_only=True)
    relationship_in_family = serializers.CharField(source='family_member.relation', read_only=True)
    partner_preference = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()
    debug_fields = serializers.SerializerMethodField()
    match_score = serializers.SerializerMethodField()
    compatibility_breakdown = serializers.SerializerMethodField()
    match_reasons = serializers.SerializerMethodField()
    match_negatives = serializers.SerializerMethodField()
    family_details = serializers.SerializerMethodField()
    views_count = serializers.SerializerMethodField()
    interests_received_count = serializers.SerializerMethodField()
    interests_sent_count = serializers.SerializerMethodField()
    photos_count = serializers.SerializerMethodField()
    visibility_details = serializers.SerializerMethodField()
    audience_count_cache = serializers.SerializerMethodField()
    visibility_reason = serializers.SerializerMethodField()
    visibility_passed = serializers.SerializerMethodField()
    failed_conditions = serializers.SerializerMethodField()
    matched_conditions = serializers.SerializerMethodField()

    class Meta:
        model = MatrimonyProfile
        fields = '__all__'

    def to_internal_value(self, data):
        # Create a mutable copy of the data dictionary if possible
        if hasattr(data, '_mutable'):
            data = data.copy()
        elif isinstance(data, dict):
            data = data.copy()
        else:
            data = dict(data)

        # Clean empty strings to None for nullable integer fields
        for field in ['divorce_year', 'year_of_loss', 'children_count']:
            if field in data and (data[field] == '' or data[field] is None):
                data[field] = None

        return super().to_internal_value(data)

    def get_match_details(self, obj):
        request = self.context.get('request')
        if not hasattr(self, '_match_details_cache'):
            self._match_details_cache = {}
        
        if obj.id in self._match_details_cache:
            return self._match_details_cache[obj.id]

        if request and request.user and request.user.is_authenticated:
            try:
                my_profile = getattr(request.user, '_cached_matrimony_profile', None)
                if not my_profile:
                    my_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
                if my_profile:
                    from api.rule_engine import MatrimonyRuleEngine
                    details = MatrimonyRuleEngine.calculateMatchScore(my_profile, obj)
                    self._match_details_cache[obj.id] = details
                    return details
            except Exception:
                pass
        
        val = (obj.id * 17) % 35 + 60
        details = {
            "score": val,
            "breakdown": {},
            "reasons": ["✓ Basic Match"],
            "negatives": []
        }
        self._match_details_cache[obj.id] = details
        return details

    def get_match_score(self, obj):
        return self.get_match_details(obj)["score"]

    def get_compatibility_breakdown(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return {}
        my_profile = getattr(request.user, '_cached_matrimony_profile', None)
        if not my_profile:
            my_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
        if not my_profile:
            return {}

        details = self.get_match_details(obj)
        breakdown = details.get("breakdown", {})
        reasons = details.get("reasons", [])
        negatives = details.get("negatives", [])

        formatted = {}
        categories = ["age", "community_caste", "marital_status", "education", "occupation", "location", "lifestyle", "religion", "income"]

        patterns = {
            "age": ["age", "years"],
            "community_caste": ["community", "caste"],
            "marital_status": ["marital"],
            "education": ["education", "qualification", "degree"],
            "occupation": ["occupation", "profession"],
            "location": ["location", "city", "state", "country"],
            "lifestyle": ["lifestyle", "diet", "smoke", "drink"],
            "religion": ["religion"],
            "income": ["income"]
        }

        for cat in categories:
            match_msg = None
            for r in reasons:
                if any(p in r.lower() for p in patterns[cat]):
                    match_msg = r
                    break

            gap_msg = None
            for n in negatives:
                if any(p in n.lower() for p in patterns[cat]):
                    gap_msg = n
                    break

            if match_msg:
                formatted[cat] = {
                    "status": "Match",
                    "message": match_msg
                }
            elif gap_msg:
                formatted[cat] = {
                    "status": "Gap",
                    "message": gap_msg
                }
            else:
                score = breakdown.get(cat, 0)
                if score > 0:
                    formatted[cat] = {
                        "status": "Match",
                        "message": "Match"
                    }
                else:
                    formatted[cat] = {
                        "status": "Gap",
                        "message": "Gap"
                    }
        return formatted

    def get_match_reasons(self, obj):
        return self.get_match_details(obj)["reasons"]

    def get_match_negatives(self, obj):
        return self.get_match_details(obj)["negatives"]

    def get_views_count(self, obj):
        try:
            return obj.profile_views_received.count()
        except Exception:
            return 0

    def get_interests_received_count(self, obj):
        try:
            return obj.received_interests.count()
        except Exception:
            return 0

    def get_interests_sent_count(self, obj):
        try:
            return obj.sent_interests.count()
        except Exception:
            return 0

    def get_photos_count(self, obj):
        try:
            return obj.photos.count()
        except Exception:
            return 0


    def get_family_details(self, obj):
        try:
            if obj.family_member and obj.family_member.family:
                family = obj.family_member.family
                members_data = []
                for m in family.members.all():
                    members_data.append({
                        "id": m.id,
                        "name": m.name,
                        "relation": m.relation,
                        "age": m.age,
                        "occupation": m.occupation,
                        "education": m.education,
                        "job_title": m.job_title,
                        "salary": m.salary
                    })
                return {
                    "id": family.id,
                    "head": family.head,
                    "village": family.village,
                    "members": members_data
                }
        except Exception:
            pass
        return None


    def get_completion_percentage(self, obj):
        try:
            return obj.calculate_completion_percentage()
        except Exception:
            return 0

    def get_debug_fields(self, obj):
        """Returns which fields count as complete for debugging purposes."""
        try:
            return {
                'name': bool(obj.name and obj.name.strip()),
                'gender': bool(obj.gender),
                'dob': bool(obj.dob),
                'education': bool(obj.education and obj.education.strip()),
                'profession': bool(obj.profession and obj.profession.strip()),
                'income': bool(obj.income and obj.income.strip()),
                'height': bool(obj.height and obj.height.strip()),
                'weight': bool(obj.weight and obj.weight.strip()),
                'complexion': bool(obj.complexion and obj.complexion.strip()),
                'diet': bool(obj.diet and obj.diet.strip()),
                'marital_status': bool(obj.marital_status and obj.marital_status.strip()),
                'mother_tongue': bool(obj.mother_tongue and obj.mother_tongue.strip()),
                'religion': bool(obj.religion and obj.religion.strip()),
                'city': bool(obj.city and obj.city.strip()),
                'state': bool(obj.state and obj.state.strip()),
                'native_place': bool(obj.native_place and obj.native_place.strip()),
                'about': bool(obj.about and len(obj.about.strip()) >= 50),
                'photo': bool(obj.photos.exists() or obj.photo),
                'preferences': obj._has_preferences(),
                'contact_info': bool(
                    (obj.contact_name and obj.contact_name.strip()) or
                    (obj.contact_phone and obj.contact_phone.strip()) or
                    obj.name
                ),
                'status': obj.status,
                'completion_percentage': obj.calculate_completion_percentage(),
            }
        except Exception as e:
            return {'error': str(e)}
        
    def get_partner_preference(self, obj):
        try:
            pref = obj.partner_preference
            if pref:
                return {
                    "id": pref.id,
                    "gender": pref.gender,
                    "min_age": pref.min_age,
                    "max_age": pref.max_age,
                    "caste": pref.caste,
                    "sub_caste": pref.sub_caste,
                    "education": pref.education,
                    "occupation": pref.occupation,
                    "city": pref.city,
                    "state": pref.state,
                    "country": pref.country,
                    "min_height": pref.min_height,
                    "max_height": pref.max_height,
                    "marital_status": pref.marital_status,
                    "income_range": pref.income_range,
                }
        except Exception:
            pass
        return None
    
    def get_photo(self, obj):
        try:
            request = self.context.get('request')
            photo_obj = obj.photos.filter(category='Profile Photo').first()
            if photo_obj:
                if photo_obj.image:
                    return request.build_absolute_uri(photo_obj.image.url) if request else photo_obj.image.url
                return photo_obj.image_url
            if obj.photo:
                return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
            return obj.photo_url
        except Exception:
            pass
        return None

    def get_visibility_details(self, obj):
        try:
            return {
                'visibility_type': getattr(obj, 'visibility_type', getattr(obj, 'visibility_scope', None)),
                'hierarchy_scope': getattr(obj, 'hierarchy_scope', getattr(obj, 'visibility_hierarchy', None)),
                'selected_communities': [c.id for c in obj.selected_communities.all()],
                'target_summary': {
                    'gender': getattr(obj, 'target_gender', getattr(obj, 'filter_gender', None)),
                    'age_min': getattr(obj, 'target_age_min', getattr(obj, 'filter_min_age', None)),
                    'age_max': getattr(obj, 'target_age_max', getattr(obj, 'filter_max_age', None)),
                }
            }
        except Exception:
            return None

    def get_audience_count_cache(self, obj):
        try:
            return int(getattr(obj, 'audience_count_cache', 0) or 0)
        except Exception:
            return 0

    def get_visibility_reason(self, obj):
        try:
            request = self.context.get('request')
            viewer_user = request.user if request else None
            from api.rule_engine import MatrimonyRuleEngine
            visible, reason = MatrimonyRuleEngine.evaluate_visibility(obj, viewer_user)
            return reason
        except Exception:
            return "Error calculating visibility"

    def get_visibility_passed(self, obj):
        try:
            request = self.context.get('request')
            viewer_user = request.user if request else None
            from api.rule_engine import MatrimonyRuleEngine
            visible, _ = MatrimonyRuleEngine.evaluate_visibility(obj, viewer_user)
            return visible
        except Exception:
            return False

    def get_failed_conditions(self, obj):
        try:
            if hasattr(obj, '_failed_conditions'):
                return obj._failed_conditions
            request = self.context.get('request')
            viewer_user = request.user if request else None
            from api.privacy_visibility_engine import PrivacyVisibilityEngine
            from api.models import MatrimonyProfile
            viewer_profile = None
            if viewer_user and viewer_user.is_authenticated:
                viewer_profile = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()
            PrivacyVisibilityEngine.canDiscoverTargetProfile(obj, viewer_profile)
            return getattr(obj, '_failed_conditions', [])
        except Exception:
            return []

    def get_matched_conditions(self, obj):
        try:
            if hasattr(obj, '_matched_conditions'):
                return obj._matched_conditions
            request = self.context.get('request')
            viewer_user = request.user if request else None
            from api.privacy_visibility_engine import PrivacyVisibilityEngine
            from api.models import MatrimonyProfile
            viewer_profile = None
            if viewer_user and viewer_user.is_authenticated:
                viewer_profile = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()
            PrivacyVisibilityEngine.canDiscoverTargetProfile(obj, viewer_profile)
            return getattr(obj, '_matched_conditions', [])
        except Exception:
            return []

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        viewer_user = request.user if request else None

        from api.rule_engine import MatrimonyRuleEngine
        ret = MatrimonyRuleEngine.serializeVisibleFields(instance, viewer_user, ret)

        # Ensure compatibility fields photo and photo_url match the resolved value
        ret['photo'] = self.get_photo(instance)
        ret['photo_url'] = ret['photo']

        return ret

# Campaign Serializer
class CampaignSerializer(serializers.ModelSerializer):
    img = serializers.ImageField(required=False, allow_null=True)
    donations_count = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    community_name = serializers.CharField(source='community.name', read_only=True)
    
    class Meta:
        model = Campaign
        fields = '__all__'
    
    def get_donations_count(self, obj):
        return obj.donations.count()
    
    def get_progress(self, obj):
        if obj.goal > 0:
            return int((obj.raised / obj.goal) * 100)
        return 0

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.img:
            request = self.context.get('request')
            if request:
                ret['img'] = request.build_absolute_uri(instance.img.url)
            else:
                ret['img'] = f"http://localhost:8000{instance.img.url}"
        else:
            ret['img'] = instance.img_url
        return ret

# Donation Serializer
class DonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = '__all__'

# News Serializer
class NewsSerializer(serializers.ModelSerializer):
    img = serializers.ImageField(required=False, allow_null=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    
    class Meta:
        model = News
        fields = '__all__'
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.img:
            request = self.context.get('request')
            if request:
                ret['img'] = request.build_absolute_uri(instance.img.url)
            else:
                ret['img'] = f"http://localhost:8000{instance.img.url}"
        else:
            ret['img'] = instance.img_url
        return ret

# Family Member Serializer
class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = '__all__'

# Family Serializer
class FamilySerializer(serializers.ModelSerializer):
    members = FamilyMemberSerializer(many=True, read_only=True)
    
    class Meta:
        model = Family
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    communityName = serializers.SerializerMethodField()
    communityId = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    planExpiry = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'name', 'username', 'email', 'password', 'role', 'avatar', 'communityName', 'communityId', 'plan', 'planExpiry')

    def get_role(self, obj):
        try:
            return obj.member_profile.role
        except Exception:
            return 'member'

    def get_name(self, obj):
        try:
            return obj.member_profile.name
        except Exception:
            return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_avatar(self, obj):
        try:
            profile = obj.member_profile
            if profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
            return profile.avatar_url
        except Exception:
            return ""

    def get_communityName(self, obj):
        try:
            return obj.member_profile.community.name
        except Exception:
            return ""

    def get_communityId(self, obj):
        try:
            return obj.member_profile.community.id
        except Exception:
            return None

    def get_plan(self, obj):
        try:
            community = obj.member_profile.community
            if community:
                from api.models import CommunitySubscription
                sub = CommunitySubscription.objects.filter(community=community).first()
                if sub and sub.plan:
                    return sub.plan.name
                return community.plan or "Free"
        except Exception:
            pass
        return "Free"

    def get_planExpiry(self, obj):
        try:
            community = obj.member_profile.community
            if community:
                from api.models import CommunitySubscription
                sub = CommunitySubscription.objects.filter(community=community).first()
                if sub and sub.end_date:
                    return sub.end_date.strftime("%Y-%m-%d")
        except Exception:
            pass
        return "2027-12-31"

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('name', '').split(' ')[0] if 'name' in validated_data else '',
            last_name=' '.join(validated_data.get('name', '').split(' ')[1:]) if 'name' in validated_data else ''
        )
        return user



# Duplicate EventSerializer, JobSerializer, BusinessSerializer deleted to prevent overriding top definitions
class EventRegistrationSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = EventRegistration
        fields = '__all__'

class CommunityApprovalHistorySerializer(serializers.ModelSerializer):
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    
    class Meta:
        model = CommunityApprovalHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class ModulePermissionDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModulePermissionDefinition
        fields = ('id', 'code', 'name')

class FeatureMasterSerializer(serializers.ModelSerializer):
    permission_definitions = ModulePermissionDefinitionSerializer(many=True, read_only=True)
    class Meta:
        model = FeatureMaster
        fields = ('id', 'name', 'code', 'description', 'active', 'created_at', 'permission_definitions')

class PlanFeaturePermissionSerializer(serializers.ModelSerializer):
    feature_name = serializers.ReadOnlyField(source='feature.name')
    feature_code = serializers.ReadOnlyField(source='feature.code')
    class Meta:
        model = PlanFeaturePermission
        fields = '__all__'

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    feature_permissions = PlanFeaturePermissionSerializer(many=True, read_only=True)
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class CommunitySubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    class Meta:
        model = CommunitySubscription
        fields = '__all__'

class SubscriptionHistorySerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    class Meta:
        model = SubscriptionHistory
        fields = '__all__'

class SystemQuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemQuota
        fields = '__all__'

class PlanAddonSerializer(serializers.ModelSerializer):
    target_limit_details = SystemQuotaSerializer(source='target_limit', read_only=True)
    target_limit = serializers.SlugRelatedField(
        queryset=SystemQuota.objects.all(),
        slug_field='code',
        required=False,
        allow_null=True
    )
    class Meta:
        model = PlanAddon
        fields = '__all__'

class FeatureUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureUsage
        fields = '__all__'

class SubscriptionAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.ReadOnlyField(source='changed_by.username')
    class Meta:
        model = SubscriptionAuditLog
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class AdvertisementSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Advertisement
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request:
                ret['image'] = request.build_absolute_uri(instance.image.url)
            else:
                ret['image'] = f"http://localhost:8000{instance.image.url}"
        else:
            ret['image'] = instance.image_url
        return ret

class GallerySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Gallery
        fields = '__all__'
        
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request:
                ret['image'] = request.build_absolute_uri(instance.image.url)
            else:
                ret['image'] = f"http://localhost:8000{instance.image.url}"
        else:
            ret['image'] = instance.image_url
        return ret

class PartnerPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPreference
        fields = '__all__'

class ProfileVisibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileVisibility
        fields = '__all__'

class InterestRequestSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.name', read_only=True)
    sender_photo = serializers.SerializerMethodField(read_only=True)
    sender_photo_url = serializers.SerializerMethodField(read_only=True)
    receiver_photo_url = serializers.SerializerMethodField(read_only=True)
    sender_details = MatrimonyProfileSerializer(source='sender', read_only=True)
    receiver_details = MatrimonyProfileSerializer(source='receiver', read_only=True)
    
    class Meta:
        model = InterestRequest
        fields = '__all__'

    def _get_profile_photo(self, profile):
        try:
            photo_obj = profile.photos.filter(category='Profile Photo').first()
            if photo_obj:
                if photo_obj.image:
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(photo_obj.image.url)
                    return photo_obj.image.url
                return photo_obj.image_url
            if profile.photo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.photo.url)
                return profile.photo.url
            return profile.photo_url
        except Exception:
            return None

    def get_sender_photo(self, obj):
        try:
            return self._get_profile_photo(obj.sender)
        except Exception:
            return None

    def get_sender_photo_url(self, obj):
        try:
            return self._get_profile_photo(obj.sender)
        except Exception:
            return None

    def get_receiver_photo_url(self, obj):
        try:
            return self._get_profile_photo(obj.receiver)
        except Exception:
            return None

class WishlistSerializer(serializers.ModelSerializer):
    profile_details = MatrimonyProfileSerializer(source='profile', read_only=True)
    class Meta:
        model = Wishlist
        fields = '__all__'

class ProfileViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileView
        fields = '__all__'

from api.models import MessageRequest, Conversation, Message, MessageReaction

class MessageRequestSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    sender_photo = serializers.SerializerMethodField(read_only=True)
    sender_profession = serializers.CharField(source='sender.profession', read_only=True)
    sender_village = serializers.CharField(source='sender.village', read_only=True)
    sender_community_name = serializers.CharField(source='sender.community.name', read_only=True)

    receiver_name = serializers.CharField(source='receiver.name', read_only=True)
    receiver_photo = serializers.SerializerMethodField(read_only=True)
    receiver_profession = serializers.CharField(source='receiver.profession', read_only=True)
    receiver_village = serializers.CharField(source='receiver.village', read_only=True)
    receiver_community_name = serializers.CharField(source='receiver.community.name', read_only=True)

    class Meta:
        model = MessageRequest
        fields = '__all__'

    def get_sender_photo(self, obj):
        if obj.sender.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.sender.avatar.url) if request else obj.sender.avatar.url
        return obj.sender.avatar_url

    def get_receiver_photo(self, obj):
        if obj.receiver.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.receiver.avatar.url) if request else obj.receiver.avatar.url
        return obj.receiver.avatar_url

class MessageReactionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'member', 'member_name']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    sender_photo = serializers.SerializerMethodField(read_only=True)
    reply_to_details = serializers.SerializerMethodField(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = '__all__'

    def get_sender_photo(self, obj):
        if obj.sender.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.sender.avatar.url) if request else obj.sender.avatar.url
        return obj.sender.avatar_url

    def get_reply_to_details(self, obj):
        if obj.reply_to:
            image_url = None
            if obj.reply_to.image:
                request = self.context.get('request')
                image_url = request.build_absolute_uri(obj.reply_to.image.url) if request else obj.reply_to.image.url
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content,
                'sender': obj.reply_to.sender.id,
                'sender_name': obj.reply_to.sender.name,
                'image': image_url
            }
        return None

class ConversationSerializer(serializers.ModelSerializer):
    participant_1_details = serializers.SerializerMethodField(read_only=True)
    participant_2_details = serializers.SerializerMethodField(read_only=True)
    last_message = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Conversation
        fields = '__all__'

    def _get_member_details(self, member):
        photo_url = None
        if member.avatar:
            request = self.context.get('request')
            photo_url = request.build_absolute_uri(member.avatar.url) if request else member.avatar.url
        else:
            photo_url = member.avatar_url
            
        return {
            'id': member.id,
            'name': member.name,
            'photo': photo_url,
            'profession': member.profession,
            'village': member.village,
            'community_name': member.community.name if member.community else None
        }

    def get_participant_1_details(self, obj):
        return self._get_member_details(obj.participant_1)

    def get_participant_2_details(self, obj):
        return self._get_member_details(obj.participant_2)

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return {
                'id': msg.id,
                'content': msg.content,
                'created_at': msg.created_at,
                'sender_id': msg.sender_id,
                'is_seen': msg.is_seen
            }
        return None

from .models import (
    BookingProperty, PropertyResource, ResourcePricing, ResourceLock,
    VenueBooking, BookingInspection, BookingRefund, BookingWaitingList, ResourceDependency
)

class BookingPropertySerializer(serializers.ModelSerializer):
    community_name = serializers.CharField(source='community.name', read_only=True)
    cover_image = serializers.SerializerMethodField()
    gallery_images = serializers.SerializerMethodField()
    starting_price = serializers.SerializerMethodField()
    available_resources = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    
    class Meta:
        model = BookingProperty
        fields = '__all__'
        read_only_fields = ['community']

    def validate(self, attrs):
        status_value = attrs.get('status', getattr(self.instance, 'status', 'Pending Approval'))
        reason = attrs.get('rejection_reason', getattr(self.instance, 'rejection_reason', ''))
        if status_value == 'Rejected' and not str(reason or '').strip():
            raise serializers.ValidationError({'rejection_reason': 'Rejection reason is required when rejecting a property.'})
        return attrs

    def get_cover_image(self, obj):
        return obj.photos[0] if isinstance(obj.photos, list) and obj.photos else None

    def get_gallery_images(self, obj):
        return obj.photos if isinstance(obj.photos, list) else []

    def get_starting_price(self, obj):
        rates = []
        for resource in obj.resources.all():
            for rate in (resource.hourly_rate, resource.half_day_rate, resource.full_day_rate):
                try:
                    value = float(rate or 0)
                    if value > 0:
                        rates.append(value)
                except Exception:
                    pass
            for pricing in resource.pricing.all():
                try:
                    value = float(pricing.price or 0)
                    if value > 0:
                        rates.append(value)
                except Exception:
                    pass
        return min(rates) if rates else float(obj.security_deposit or 0)

    def get_available_resources(self, obj):
        return obj.resources.filter(status='Active').count()

    def get_availability_status(self, obj):
        if obj.status != 'Approved':
            return 'Unavailable'
        return 'Available' if obj.resources.filter(status='Active').exists() else 'No Active Resources'

class PropertyResourceSerializer(serializers.ModelSerializer):
    photos = serializers.SerializerMethodField()
    dependencies = serializers.SerializerMethodField()
    required_by = serializers.SerializerMethodField()

    class Meta:
        model = PropertyResource
        fields = '__all__'


    def validate(self, attrs):
        min_hours = attrs.get('min_booking_duration_hours', getattr(self.instance, 'min_booking_duration_hours', 1))
        max_hours = attrs.get('max_booking_duration_hours', getattr(self.instance, 'max_booking_duration_hours', 24))
        if min_hours and max_hours and int(min_hours) > int(max_hours):
            raise serializers.ValidationError({'max_booking_duration_hours': 'Maximum booking duration must be greater than or equal to minimum duration.'})
        return attrs

    def get_photos(self, obj):
        return obj.media if isinstance(obj.media, list) else []

    def get_dependencies(self, obj):
        return [dep.requires.id for dep in obj.dependencies.all()]

    def get_required_by(self, obj):
        return [dep.resource.id for dep in obj.required_by.all()]

class ResourceDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceDependency
        fields = '__all__'

class ResourcePricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourcePricing
        fields = '__all__'

class ResourceLockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceLock
        fields = '__all__'

class VenueBookingSerializer(serializers.ModelSerializer):
    property_details = BookingPropertySerializer(source='property', read_only=True)
    resources_details = PropertyResourceSerializer(source='resources', many=True, read_only=True)
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = VenueBooking
        fields = '__all__'
        read_only_fields = ['member', 'booking_number']

class BookingInspectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingInspection
        fields = '__all__'

class BookingRefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingRefund
        fields = '__all__'

class BookingWaitingListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingWaitingList
        fields = '__all__'


class ApplicationActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationAction
        fields = '__all__'

class ModuleActionSerializer(serializers.ModelSerializer):
    action_name = serializers.ReadOnlyField(source='action.name')
    class Meta:
        model = ModuleAction
        fields = '__all__'

class ApplicationModuleSerializer(serializers.ModelSerializer):
    module_actions = ModuleActionSerializer(many=True, read_only=True)
    actions = serializers.SerializerMethodField(read_only=True)
    parent_module_name = serializers.ReadOnlyField(source='parent_module.display_name')
    locked = serializers.SerializerMethodField(read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ApplicationModule
        fields = '__all__'

    def get_actions(self, obj):
        return [ma.action.name for ma in obj.module_actions.all()]

    def get_permissions(self, obj):
        request = self.context.get('request')
        default_perms = {
            'view': True,
            'create': True,
            'edit': True,
            'delete': True,
            'export': True,
            'import': True,
            'approve': True,
            'reject': True,
            'assign': True,
            'manage': True
        }
        if not request or not request.user or not request.user.is_authenticated:
            return default_perms
            
        user = request.user
        is_super = user.is_superuser
        try:
            member = user.member_profile
            if member and member.role == 'super_admin':
                is_super = True
        except Exception:
            member = None
            
        if is_super:
            return default_perms
            
        if not member:
            return default_perms
            
        if member.role == 'community_admin':
            from api.models import CommunitySubscription, SubscriptionPlan, FeatureMaster, PlanFeaturePermission
            always_available_admin = {'dashboard', 'plans', 'plan', 'settings', 'subscriptions'}
            if obj.module_code in always_available_admin:
                return default_perms
                
            community = member.community
            if not community:
                return default_perms
                
            sub = CommunitySubscription.objects.filter(community=community).first()
            if not sub:
                plan = SubscriptionPlan.objects.filter(code="basic").first()
                if not plan:
                    plan = SubscriptionPlan.objects.first()
            else:
                plan = sub.plan
                
            if not plan:
                return default_perms
                
            feature = FeatureMaster.objects.filter(code=obj.module_code).first()
            if not feature:
                return default_perms
                
            perm = PlanFeaturePermission.objects.filter(plan=plan, feature=feature).first()
            if perm:
                return {
                    'view': perm.can_view,
                    'create': perm.can_create,
                    'edit': perm.can_edit,
                    'delete': perm.can_delete,
                    'export': perm.can_export,
                    'import': perm.can_import,
                    'approve': perm.can_approve,
                    'reject': perm.can_reject,
                    'assign': perm.can_assign,
                    'manage': perm.can_manage
                }
            
            return {k: False for k in default_perms}
            
        return default_perms

    def get_locked(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
            
        user = request.user
        is_super = user.is_superuser
        try:
            member = user.member_profile
            if member and member.role == 'super_admin':
                is_super = True
        except Exception:
            member = None
            
        if is_super:
            return False
            
        if not member:
            return False
            
        # If user is community admin, check community subscription plan permissions
        if member.role == 'community_admin':
            from api.models import CommunitySubscription, SubscriptionPlan, FeatureMaster, PlanFeaturePermission
            always_available_admin = {'dashboard', 'plans', 'plan', 'settings', 'subscriptions'}
            if obj.module_code in always_available_admin:
                return False
                
            community = member.community
            if not community:
                return False
                
            sub = CommunitySubscription.objects.filter(community=community).first()
            if not sub:
                plan = SubscriptionPlan.objects.filter(code="basic").first()
                if not plan:
                    plan = SubscriptionPlan.objects.first()
            else:
                plan = sub.plan
                
            if not plan:
                return False
                
            feature = FeatureMaster.objects.filter(code=obj.module_code).first()
            if not feature:
                return False
                
            perm = PlanFeaturePermission.objects.filter(plan=plan, feature=feature).first()
            if perm:
                return not perm.can_view
            return False
            
        sub = MemberPremiumSubscription.objects.filter(
            member=member,
            status__in=['active', 'trial', 'grace_period']
        ).first()
        
        plan = None
        if sub:
            plan = sub.plan
        else:
            plan = MemberPremiumPlan.objects.filter(code='free').first()
            
        if not plan:
            return False
            
        code = obj.module_code
        
        # If the plan is a free plan, lock everything except dashboard and my subscription (or plan)
        if plan.plan_type == 'free' or plan.code == 'free':
            if code in ['dashboard', 'subscription', 'plan']:
                return False
            return True
            
        module_to_category_map = {
            'matrimony': 'matrimony',
            'messages': 'messaging',
            'business': 'business',
            'jobs': 'jobs',
            'events': 'events',
            'venues': 'venues',
            'properties': 'property',
            'members': 'directory',
            'donations': 'donations',
            'advertisements': 'ads',
            'ai': 'ai',
            'committee': 'committee',
            'attendance': 'attendance',
            'subsidiaries': 'subsidiaries',
        }
        
        always_available = {
            'dashboard', 'profile', 'plan', 'subscription', 'family', 'hierarchy', 'notifications', 'settings'
        }
        
        if code in always_available:
            return False
            
        category = module_to_category_map.get(code)
        if not category:
            return False
            
        feature_exists = MemberPremiumFeature.objects.filter(
            plan=plan,
            category=category,
            is_enabled=True
        ).exists()
        
        return not feature_exists


class ApplicationModuleAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.ReadOnlyField(source='changed_by.username')
    class Meta:
        model = ApplicationModuleAuditLog
        fields = '__all__'


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: MEMBER PREMIUM SUBSCRIPTION SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────
from .models import (
    PremiumFeatureRegistry,
    MemberPremiumPlan, MemberPremiumFeature, MemberPremiumBenefit,
    MemberPremiumAddon, MemberPremiumCoupon, MemberPremiumSubscription,
    MemberFeatureUsage, MemberPremiumTransaction, MemberPremiumInvoice,
    MemberAddonPurchase, MemberPremiumAuditLog, MemberPremiumReward, MemberPremiumSupportTicket
)


class PremiumFeatureRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumFeatureRegistry
        fields = '__all__'


class MemberPremiumFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberPremiumFeature
        fields = '__all__'
        read_only_fields = ['plan']


class MemberPremiumBenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberPremiumBenefit
        fields = '__all__'
        read_only_fields = ['plan']


class MemberPremiumPlanSerializer(serializers.ModelSerializer):
    features = MemberPremiumFeatureSerializer(many=True, required=False)
    benefits = MemberPremiumBenefitSerializer(many=True, required=False)
    active_subscribers = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemberPremiumPlan
        fields = '__all__'

    def get_active_subscribers(self, obj):
        return MemberPremiumSubscription.objects.filter(plan=obj, status__in=['active', 'trial', 'grace_period']).count()

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        if 'features' in repr_data and repr_data['features'] is not None:
            repr_data['features'] = [f for f in repr_data['features'] if f.get('is_enabled') is True]
        return repr_data

    def create(self, validated_data):
        features_data = self.context.get('request').data.get('features', []) if self.context.get('request') else []
        benefits_data = self.context.get('request').data.get('benefits', []) if self.context.get('request') else []
        
        # Pop nested writeable fields to prevent TypeError: 'features' is an invalid keyword argument for this function
        validated_data.pop('features', None)
        validated_data.pop('benefits', None)
        
        plan = MemberPremiumPlan.objects.create(**validated_data)
        
        for f in features_data:
            # Pop plan from f if it is sent to avoid duplicate field errors
            f.pop('plan', None)
            MemberPremiumFeature.objects.create(plan=plan, **f)
        for b in benefits_data:
            b.pop('plan', None)
            MemberPremiumBenefit.objects.create(plan=plan, **b)
            
        return plan

    def update(self, instance, validated_data):
        features_data = self.context.get('request').data.get('features', []) if self.context.get('request') else []
        benefits_data = self.context.get('request').data.get('benefits', []) if self.context.get('request') else []
        
        # Pop nested writeable fields to prevent TypeError
        validated_data.pop('features', None)
        validated_data.pop('benefits', None)
        
        # Update plan basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Sync features
        payload_codes = [f.get('feature_code') for f in features_data if f.get('feature_code')]
        instance.features.exclude(feature_code__in=payload_codes).delete()
        
        for f in features_data:
            code = f.get('feature_code')
            if not code:
                continue
            MemberPremiumFeature.objects.update_or_create(
                plan=instance,
                feature_code=code,
                defaults={
                    'name': f.get('name', ''),
                    'description': f.get('description', ''),
                    'category': f.get('category', 'other'),
                    'icon': f.get('icon', 'star'),
                    'display_badge': f.get('display_badge', ''),
                    'is_enabled': f.get('is_enabled', True),
                    'is_unlimited': f.get('is_unlimited', False),
                    'limit_type': f.get('limit_type', 'unlimited'),
                    'limit_value': f.get('limit_value', 0),
                    'priority': f.get('priority', 0),
                    'upgrade_message': f.get('upgrade_message', ''),
                }
            )
            
        # Sync benefits
        payload_titles = [b.get('title') for b in benefits_data if b.get('title')]
        instance.benefits.exclude(title__in=payload_titles).delete()
        
        for b in benefits_data:
            title = b.get('title')
            if not title:
                continue
            MemberPremiumBenefit.objects.update_or_create(
                plan=instance,
                title=title,
                defaults={
                    'description': b.get('description', ''),
                    'icon': b.get('icon', 'check'),
                    'is_highlight': b.get('is_highlight', False),
                    'display_order': b.get('display_order', 0),
                    'is_included': b.get('is_included', True),
                }
            )
            
        return instance


class MemberPremiumAddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberPremiumAddon
        fields = '__all__'


class MemberPremiumCouponSerializer(serializers.ModelSerializer):
    applicable_plans_names = serializers.SerializerMethodField()

    class Meta:
        model = MemberPremiumCoupon
        fields = '__all__'

    def get_applicable_plans_names(self, obj):
        return list(obj.applicable_plans.values_list('name', flat=True))


class MemberFeatureUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberFeatureUsage
        fields = '__all__'


class MemberPremiumTransactionSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = MemberPremiumTransaction
        fields = '__all__'

    def get_member_name(self, obj):
        try:
            return obj.subscription.member.name
        except Exception:
            return ''


class MemberPremiumInvoiceSerializer(serializers.ModelSerializer):
    transaction_type = serializers.ReadOnlyField(source='transaction.transaction_type')
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = MemberPremiumInvoice
        fields = '__all__'

    def get_member_name(self, obj):
        try:
            return obj.transaction.subscription.member.name
        except Exception:
            return ''


class MemberAddonPurchaseSerializer(serializers.ModelSerializer):
    addon_name = serializers.ReadOnlyField(source='addon.name')
    member_name = serializers.ReadOnlyField(source='member.name')

    class Meta:
        model = MemberAddonPurchase
        fields = '__all__'


class MemberPremiumSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    plan_code = serializers.ReadOnlyField(source='plan.code')
    plan_type = serializers.ReadOnlyField(source='plan.plan_type')
    plan_color = serializers.ReadOnlyField(source='plan.color_theme')
    member_name = serializers.ReadOnlyField(source='member.name')
    member_email = serializers.ReadOnlyField(source='member.email')
    member_photo = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    feature_usages = MemberFeatureUsageSerializer(many=True, read_only=True)
    transactions = MemberPremiumTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = MemberPremiumSubscription
        fields = '__all__'

    def get_member_photo(self, obj):
        try:
            photo = obj.member.photo
            if photo:
                request = self.context.get('request')
                url = photo.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None

    def get_is_active(self, obj):
        return obj.is_currently_active()


class MemberPremiumAuditLogSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source='member.name')
    performed_by_name = serializers.ReadOnlyField(source='performed_by.username')
    plan_name = serializers.ReadOnlyField(source='plan.name')

    class Meta:
        model = MemberPremiumAuditLog
        fields = '__all__'


# Phase 3.3: Community Subscription Management Serializers
class CommunityLicenseSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')

    class Meta:
        model = CommunityLicense
        fields = '__all__'


class CommunityModuleAccessSerializer(serializers.ModelSerializer):
    module_name = serializers.ReadOnlyField(source='module.display_name')
    module_code = serializers.ReadOnlyField(source='module.module_code')

    class Meta:
        model = CommunityModuleAccess
        fields = '__all__'


class CommunityUsageSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')

    class Meta:
        model = CommunityUsage
        fields = '__all__'


class CommunityBillingSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')

    class Meta:
        model = CommunityBilling
        fields = '__all__'


class CommunityInvoiceSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')

    class Meta:
        model = CommunityInvoice
        fields = '__all__'


class CommunityTransactionSerializer(serializers.ModelSerializer):
    invoice_no = serializers.ReadOnlyField(source='invoice.invoice_no')

    class Meta:
        model = CommunityTransaction
        fields = '__all__'


class CommunityAddonSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')
    addon_name = serializers.ReadOnlyField(source='addon.name')
    addon_code = serializers.ReadOnlyField(source='addon.code')

    class Meta:
        model = CommunityAddon
        fields = '__all__'


class CommunityAuditLogSerializer(serializers.ModelSerializer):
    community_name = serializers.ReadOnlyField(source='community.name')
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = CommunityAuditLog
        fields = '__all__'


class MemberPremiumRewardSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source='member.name')

    class Meta:
        model = MemberPremiumReward
        fields = '__all__'
        read_only_fields = ['member']


class MemberPremiumSupportTicketSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source='member.name')

    class Meta:
        model = MemberPremiumSupportTicket
        fields = '__all__'
        read_only_fields = ['member', 'ticket_no']
