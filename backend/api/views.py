from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
import datetime
import logging
import random

import json
import os
import threading
import tempfile

class FileOTPStore:
    def __init__(self, filepath=None):
        if filepath is None:
            self.filepath = os.path.join(tempfile.gettempdir(), 'wag_otp_store.json')
        else:
            self.filepath = filepath
        self.lock = threading.Lock()
        # Initialize file if not exists
        if not os.path.exists(self.filepath):
            self.write_store({})

    def read_store(self):
        with self.lock:
            try:
                if os.path.exists(self.filepath):
                    with open(self.filepath, 'r') as f:
                        data = json.load(f)
                        # Convert expiry_time strings back to datetime objects
                        for email, otp_data in data.items():
                            if 'expiry_time' in otp_data and isinstance(otp_data['expiry_time'], str):
                                otp_data['expiry_time'] = datetime.datetime.fromisoformat(otp_data['expiry_time'])
                        return data
            except Exception as e:
                print(f"Error reading OTP store: {e}")
            return {}

    def write_store(self, data):
        with self.lock:
            try:
                # Convert datetime objects to ISO strings for JSON serialization
                serialized = {}
                for email, otp_data in data.items():
                    item = otp_data.copy()
                    if 'expiry_time' in item and isinstance(item['expiry_time'], datetime.datetime):
                        item['expiry_time'] = item['expiry_time'].isoformat()
                    serialized[email] = item
                with open(self.filepath, 'w') as f:
                    json.dump(serialized, f)
            except Exception as e:
                print(f"Error writing OTP store: {e}")

    def get(self, email):
        return self.read_store().get(email)

    def keys(self):
        return self.read_store().keys()

    def __setitem__(self, email, value):
        data = self.read_store()
        data[email] = value
        self.write_store(data)

    def pop(self, email, default=None):
        data = self.read_store()
        val = data.pop(email, default)
        self.write_store(data)
        return val

OTP_STORE = FileOTPStore()

# Print active OTPs on startup
try:
    active_otps = OTP_STORE.read_store()
    now = datetime.datetime.now()
    has_active = False
    for email, otp_data in list(active_otps.items()):
        if otp_data.get('expiry_time') and otp_data['expiry_time'] > now:
            if not has_active:
                import sys
                print(f"\n{'='*60}")
                print("[OTP] ACTIVE OTP SESSIONS (RESTORED FROM PERSISTENT STORE)")
                has_active = True
            print(f"[OTP] Email: {email} | Code: {otp_data.get('otp')} | Purpose: {otp_data.get('purpose')} | Expiry: {otp_data.get('expiry_time')}")
    if has_active:
        print(f"{'='*60}\n")
        sys.stdout.flush()
except Exception as e:
    print(f"Error printing active OTPs on startup: {e}")

from .models import (
    Community, Member, Committee, Event, Job,
    Business, MatrimonyProfile, Campaign, Donation,
    News, Family, FamilyMember, EventRegistration,
    CommunityApprovalHistory, Notification, SubscriptionPlan, Role, Advertisement, Gallery,
    PartnerPreference, ProfileVisibility, InterestRequest, Wishlist, ProfileView,
    CommunityActivityLog, MatrimonyPhoto, MatrimonyAuditLog, JobApplication,
    FeatureMaster, PlanFeaturePermission, CommunitySubscription, SubscriptionHistory,
    PlanAddon, FeatureUsage, SubscriptionAuditLog,
    ApplicationModule, ApplicationAction, ModuleAction, ApplicationModuleAuditLog
)
from .serializers import (
    CommunitySerializer, MemberSerializer, UserSerializer,
    CommitteeSerializer, EventSerializer, JobSerializer,
    BusinessSerializer, MatrimonyProfileSerializer, CampaignSerializer,
    DonationSerializer, NewsSerializer, FamilySerializer, FamilyMemberSerializer,
    EventRegistrationSerializer, CommunityApprovalHistorySerializer, NotificationSerializer,
    SubscriptionPlanSerializer, RoleSerializer, AdvertisementSerializer, GallerySerializer,
    PartnerPreferenceSerializer, ProfileVisibilitySerializer, InterestRequestSerializer,
    WishlistSerializer, ProfileViewSerializer, MatrimonyPhotoSerializer, MatrimonyAuditLogSerializer,
    JobApplicationSerializer,
    FeatureMasterSerializer, PlanFeaturePermissionSerializer, CommunitySubscriptionSerializer,
    SubscriptionHistorySerializer, PlanAddonSerializer, FeatureUsageSerializer,
    SubscriptionAuditLogSerializer,
    ApplicationModuleSerializer, ApplicationActionSerializer, ModuleActionSerializer,
    ApplicationModuleAuditLogSerializer
)

from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

class MemberPremiumModulePermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        member = getattr(request.user, 'member_profile', None)
        if request.user.is_superuser or (member and member.role in ['super_admin', 'community_admin']):
            return True
        if not member:
            return True
            
        view_name = view.__class__.__name__
        mapping = {
            'ConversationViewSet': ('UNLIMITED_CHAT', 'Messaging'),
            'MessageViewSet': ('UNLIMITED_CHAT', 'Messaging'),
            'MessageRequestViewSet': ('UNLIMITED_CHAT', 'Messaging'),
            'MatrimonyProfileViewSet': ('MATRIMONY_INTERESTS', 'Matrimony'),
            'JobViewSet': ('JOBS_UNLIMITED_APPLY', 'Jobs'),
            'BusinessViewSet': ('BUSINESS_PROMOTIONS', 'Business'),
            'EventViewSet': ('EVENTS_UNLIMITED', 'Events'),
            'VenueBookingViewSet': ('VENUE_BOOKING_ENABLED', 'Venue Booking'),
            'BookingPropertyViewSet': ('VENUE_BOOKING_ENABLED', 'Venue Booking'),
            'DonationViewSet': ('DONATIONS_ENABLED', 'Donations'),
            'FundraisingCampaignViewSet': ('DONATIONS_ENABLED', 'Donations'),
            'AdvertisementViewSet': ('BUSINESS_ADS', 'Advertisements'),
        }
        
        res = mapping.get(view_name)
        if res:
            feature_code, module_name = res
            from .views import check_member_feature_limit
            has_access, err_msg = check_member_feature_limit(member, feature_code, increment=False)
            if not has_access:
                raise PermissionDenied({
                    "detail": f"Access to {module_name} is restricted. {err_msg}",
                    "upgrade_required": True
                })
                
        return True

BOOKING_ACTIVE_STATUSES = ['Pending Approval', 'Pending Payment', 'Confirmed', 'Checked In', 'Refund Requested']

def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def _booking_window(start_date, end_date, start_time, end_time):
    return (
        datetime.datetime.combine(start_date, start_time),
        datetime.datetime.combine(end_date, end_time),
    )

def _parse_booking_request(data):
    start_date = datetime.datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
    end_date = datetime.datetime.strptime(data.get('end_date') or data.get('start_date'), '%Y-%m-%d').date()
    start_time = datetime.datetime.strptime((data.get('start_time') or '00:00')[:5], '%H:%M').time()
    end_time = datetime.datetime.strptime((data.get('end_time') or '23:59')[:5], '%H:%M').time()
    if end_date < start_date:
        raise ValueError('End date cannot be before start date.')
    start_dt, end_dt = _booking_window(start_date, end_date, start_time, end_time)
    if end_dt <= start_dt:
        raise ValueError('End time must be after start time.')
    return start_date, end_date, start_time, end_time, start_dt, end_dt

def _minutes_to_label(minutes):
    hours = minutes // 60
    mins = minutes % 60
    suffix = 'AM' if hours < 12 else 'PM'
    display_hour = hours % 12 or 12
    return f'{display_hour}:{mins:02d} {suffix}'

def _format_datetime_range(start_dt, end_dt):
    return f'{start_dt.strftime("%b %d, %I:%M %p")} - {end_dt.strftime("%b %d, %I:%M %p")}'

def _resource_conflicts(resource, start_dt, end_dt, exclude_booking_id=None):
    bookings = VenueBooking.objects.filter(
        resources=resource,
        start_date__lte=end_dt.date(),
        end_date__gte=start_dt.date(),
        status__in=BOOKING_ACTIVE_STATUSES,
    )
    if exclude_booking_id:
        bookings = bookings.exclude(id=exclude_booking_id)

    intervals = []

    for booking in bookings:
        booking_start_dt, booking_end_dt = _booking_window(booking.start_date, booking.end_date, booking.start_time, booking.end_time)
        booking_start_dt -= datetime.timedelta(hours=float(resource.setup_buffer_hours or 0))
        booking_end_dt += datetime.timedelta(hours=float(resource.cleanup_buffer_hours or 0))

        if booking_start_dt < end_dt and booking_end_dt > start_dt:
            overlap_start = max(start_dt, booking_start_dt)
            overlap_end = min(end_dt, booking_end_dt)
            if overlap_start < overlap_end:
                intervals.append({
                    'type': 'booking',
                    'booking_id': booking.id,
                    'booking_number': booking.booking_number,
                    'start': overlap_start.timestamp(),
                    'end': overlap_end.timestamp(),
                    'label': _format_datetime_range(overlap_start, overlap_end),
                })

    req_start_aw = timezone.make_aware(start_dt) if timezone.is_naive(start_dt) else start_dt
    req_end_aw = timezone.make_aware(end_dt) if timezone.is_naive(end_dt) else end_dt
    for lock in ResourceLock.objects.filter(resource=resource, expires_at__gt=timezone.now()):
        if lock.start_time < req_end_aw and lock.end_time > req_start_aw:
            lock_start = timezone.make_naive(lock.start_time) if timezone.is_aware(lock.start_time) else lock.start_time
            lock_end = timezone.make_naive(lock.end_time) if timezone.is_aware(lock.end_time) else lock.end_time
            overlap_start = max(start_dt, lock_start)
            overlap_end = min(end_dt, lock_end)
            if overlap_start < overlap_end:
                intervals.append({
                    'type': 'lock',
                    'start': overlap_start.timestamp(),
                    'end': overlap_end.timestamp(),
                    'label': _format_datetime_range(overlap_start, overlap_end),
                })
    intervals.sort(key=lambda item: item['start'])
    return intervals

def _availability_for_resources(property_obj, resource_ids, start_dt, end_dt, exclude_booking_id=None):
    resources = property_obj.resources.filter(id__in=resource_ids, status='Active')
    requested_ids = {int(rid) for rid in resource_ids}
    found_ids = {res.id for res in resources}
    req_start_ts = start_dt.timestamp()
    req_end_ts = end_dt.timestamp()
    details = []
    all_available = True

    for missing_id in sorted(requested_ids - found_ids):
        all_available = False
        details.append({
            'resource_id': missing_id,
            'resource_name': 'Unknown resource',
            'status': 'unavailable',
            'available': False,
            'conflicts': [{'label': 'Resource is inactive or not part of this property'}],
            'available_slots': [],
            'unavailable_slots': [{'label': _format_datetime_range(start_dt, end_dt)}],
        })

    for res in resources:
        conflicts = _resource_conflicts(res, start_dt, end_dt, exclude_booking_id)
        occupied = []
        for item in conflicts:
            if not occupied or item['start'] > occupied[-1]['end']:
                occupied.append({'start': item['start'], 'end': item['end']})
            else:
                occupied[-1]['end'] = max(occupied[-1]['end'], item['end'])

        available_segments = []
        cursor = req_start_ts
        for block in occupied:
            if cursor < block['start']:
                s_dt = datetime.datetime.fromtimestamp(cursor)
                e_dt = datetime.datetime.fromtimestamp(block['start'])
                available_segments.append({'start': cursor, 'end': block['start'], 'label': _format_datetime_range(s_dt, e_dt)})
            cursor = max(cursor, block['end'])
        if cursor < req_end_ts:
            s_dt = datetime.datetime.fromtimestamp(cursor)
            e_dt = datetime.datetime.fromtimestamp(req_end_ts)
            available_segments.append({'start': cursor, 'end': req_end_ts, 'label': _format_datetime_range(s_dt, e_dt)})

        if not occupied:
            resource_status = 'available'
        elif available_segments:
            resource_status = 'partial'
            all_available = False
        else:
            resource_status = 'unavailable'
            all_available = False

        details.append({
            'resource_id': res.id,
            'resource_name': res.name,
            'resource_type': res.resource_type,
            'status': resource_status,
            'available': resource_status == 'available',
            'conflicts': conflicts,
            'available_slots': available_segments,
            'unavailable_slots': [{**block, 'label': _format_datetime_range(datetime.datetime.fromtimestamp(block['start']), datetime.datetime.fromtimestamp(block['end']))} for block in occupied],
        })
    return all_available, details

def _calculate_booking_price(resources, start_dt, end_dt, extra_charges=0, tax_percentage=18.0, property_deposit=0):
    hours = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
    days = Decimal(str(max(1, (end_dt.date() - start_dt.date()).days + 1)))
    resource_lines = []
    subtotal = Decimal('0.00')
    deposit = Decimal(str(property_deposit))

    for res in resources:
        hourly = _money(res.hourly_rate)
        half_day = _money(res.half_day_rate)
        full_day = _money(res.full_day_rate)
        if hours <= Decimal('4') and hourly > 0:
            amount = hourly * hours
            rate_label = 'Hourly'
        elif hours <= Decimal('6') and half_day > 0:
            amount = half_day
            rate_label = 'Half Day'
        elif full_day > 0:
            amount = full_day * days
            rate_label = 'Full Day'
        elif hourly > 0:
            amount = hourly * hours
            rate_label = 'Hourly'
        else:
            amount = Decimal('0.00')
            rate_label = 'No Rate'

        amount = amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        subtotal += amount
        deposit += _money(res.security_deposit)
        resource_lines.append({
            'resource_id': res.id,
            'resource_name': res.name,
            'resource_type': res.resource_type,
            'rate_type': rate_label,
            'duration_hours': float(hours),
            'amount': float(amount),
            'deposit': float(_money(res.security_deposit)),
        })

    extra = _money(extra_charges)
    taxable = subtotal + extra
    tax = (taxable * (Decimal(str(tax_percentage)) / Decimal('100'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total = taxable + tax + deposit
    return {
        'resources': resource_lines,
        'duration_hours': float(hours),
        'subtotal': float(subtotal),
        'extra_charges': float(extra),
        'deposit': float(deposit),
        'tax': float(tax),
        'grand_total': float(total),
    }

def _notify_user(user, title, message, notification_type='booking'):
    if user:
        Notification.objects.create(recipient=user, title=title, message=message, notification_type=notification_type)

# ========================
# Authentication Views
# ========================

def enforce_community_isolation(request, queryset, community_field='community_id'):
    """Ensures community admins can only access their own community's data."""
    user = request.user
    if user.is_authenticated and not user.is_superuser:
        try:
            member = user.member_profile
            if member.role == 'community_admin' and member.community_id:
                return queryset.filter(**{community_field: member.community_id})
        except Exception:
            pass
    return queryset

def filter_by_community(queryset, community_id, community_field='community_id'):
    if not community_id or str(community_id).lower() in ('any', 'all', 'null', 'undefined'):
        return queryset
    if ',' in str(community_id):
        try:
            ids = [int(x.strip()) for x in str(community_id).split(',') if x.strip().isdigit()]
            if ids:
                return queryset.filter(**{f"{community_field}__in": ids})
        except Exception:
            pass
    return queryset.filter(**{community_field: community_id})

class HasCustomRolePermission(permissions.BasePermission):
    """
    Checks if a committee member with a custom role has the required permissions for the endpoint.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return True # Let other permission classes handle anonymous/unauthenticated checks

        if user.is_superuser:
            return True

        try:
            member = user.member_profile
        except Exception:
            # User has no member profile, could be staff
            return user.is_staff

        if member.role == 'super_admin':
            return True

        if member.role == 'community_admin' and not member.custom_role:
            return True

        # If they are a committee member (role = community_admin and custom_role is set)
        if member.role == 'community_admin' and member.custom_role:
            role_perms = member.custom_role.permissions if isinstance(member.custom_role.permissions, list) else []
            member_perms = member.permissions if isinstance(member.permissions, list) else []
            permissions_list = list(set(role_perms) & set(member_perms))
            view_name = view.__class__.__name__

            def has(perm):
                return perm in permissions_list

            method = request.method
            action = getattr(view, 'action', None)

            # --- Member Management ---
            if view_name == 'MemberViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Members')
                if method == 'POST': return has('Add Members')
                if method in ['PUT', 'PATCH']: 
                    if action in ['approve', 'reject']: return has('Approve Members')
                    return has('Edit Members')
                if method == 'DELETE': return has('Delete Members')

            # --- Committee Management ---
            elif view_name == 'CommitteeViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Committee')
                if method == 'POST': return has('Add Committee Members')
                if method in ['PUT', 'PATCH']: return has('Edit Committee Members')
                if method == 'DELETE': return has('Remove Committee Members')

            # --- Family Management ---
            elif view_name == 'FamilyViewSet' or view_name == 'FamilyMemberViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Families')
                if method == 'POST': return has('Add Families')
                if method in ['PUT', 'PATCH']: return has('Edit Families')
                if method == 'DELETE': return has('Delete Families')

            # --- Event Management ---
            elif view_name == 'EventViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Events')
                if method == 'POST': return has('Create Events')
                if method in ['PUT', 'PATCH']: return has('Edit Events')
                if method == 'DELETE': return has('Delete Events')

            # --- News Management ---
            elif view_name == 'NewsViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View News')
                if method == 'POST': return has('Create News')
                if method in ['PUT', 'PATCH']: return has('Edit News')
                if method == 'DELETE': return has('Delete News')

            # --- Gallery Management ---
            elif view_name == 'GalleryViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Gallery')
                if method == 'POST': return has('Upload Photos')
                if method in ['PUT', 'PATCH']: return has('Edit Photos')
                if method == 'DELETE': return has('Delete Photos')

            # --- Donation Management ---
            elif view_name == 'DonationViewSet' or view_name == 'FundraisingCampaignViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Donations')
                return has('Manage Donations')

            # --- Jobs Management ---
            elif view_name == 'JobViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Jobs')
                if method == 'POST': return has('Create Jobs')
                if method in ['PUT', 'PATCH']: return has('Edit Jobs')
                if method == 'DELETE': return has('Delete Jobs')

            # --- Business Management ---
            elif view_name == 'BusinessViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Businesses')
                if method == 'POST': return has('Add Businesses')
                if method in ['PUT', 'PATCH']: return has('Edit Businesses')
                if method == 'DELETE': return has('Delete Businesses')

            # --- Matrimony Management ---
            elif view_name == 'MatrimonyProfileViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Profiles')
                if method in ['PUT', 'PATCH']:
                    # We allow PATCH if they have any of these permissions
                    return has('Approve Profiles') or has('Edit Profiles') or has('Manage Interests') or has('Manage Matches')
                if method == 'DELETE': return has('Approve Profiles') # Fallback for deleting

            # --- Community Management ---
            elif view_name == 'CommunityViewSet':
                if method in ['GET', 'HEAD', 'OPTIONS']: return has('View Hierarchy') or has('Manage Community Information')
                if method in ['PUT', 'PATCH']: return has('Edit Community Profile') or has('Manage Logo') or has('Manage Banner')
                if method == 'POST': return has('Manage Subsidiaries')
                if method == 'DELETE': return has('Manage Subsidiaries')

            # --- Super Admin specific fallbacks ---
            elif view_name == 'RoleViewSet':
                if method in ['GET', 'HEAD']: return True
                return False # Super admin only
            elif view_name == 'AdvertisementViewSet':
                if method in ['GET', 'HEAD']: return True
                return False # Super admin only
            elif view_name == 'SubscriptionPlanViewSet':
                if method in ['GET', 'HEAD']: return True
                return False # Super admin only
            
            return False

        return True

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get("password")
        try:
            # Try to resolve user by username, email, or member phone/email case-insensitively
            user = None
            if username:
                clean_username = username.strip()
                try:
                    user = User.objects.get(username__iexact=clean_username)
                except User.DoesNotExist:
                    try:
                        user = User.objects.get(email__iexact=clean_username)
                    except User.DoesNotExist:
                        try:
                            member = Member.objects.get(email__iexact=clean_username)
                            user = member.user
                        except Member.DoesNotExist:
                            try:
                                member = Member.objects.get(phone__iexact=clean_username)
                                user = member.user
                            except Member.DoesNotExist:
                                pass
            
            if not user:
                from rest_framework import serializers
                raise serializers.ValidationError({
                    "detail": "No account found with this email, phone, or username."
                })
            
            # Update attrs username with the actual username so super().validate(attrs) works
            attrs[self.username_field] = user.username
            
            if not user.check_password(password):
                from rest_framework import serializers
                raise serializers.ValidationError({
                    "detail": "Incorrect password. Please try again."
                })
            
            if user:
                if True: # wrapper to match indent of original code
                    try:
                        member = user.member_profile
                        if not member.email_verified:
                            from rest_framework import serializers
                            raise serializers.ValidationError({
                                "detail": "Please verify your email before logging in."
                            })
                        if member.role == 'member':
                            # First check Aadhaar status
                            if member.aadhaar_status == 'Rejected':
                                from rest_framework import serializers
                                raise serializers.ValidationError({
                                    "detail": "Your login request was rejected due to an invalid Aadhaar number."
                                })
                            elif member.aadhaar_status == 'Pending':
                                from rest_framework import serializers
                                raise serializers.ValidationError({
                                    "detail": "Your Aadhaar verification is pending approval. You can login only after the community admin verifies your Aadhaar number."
                                })
                            # Then check general profile status
                            elif member.status not in ['Verified', 'Active']:
                                from rest_framework import serializers
                                raise serializers.ValidationError({
                                    "detail": "Your member profile is pending approval. You can login only after the community admin approves your request."
                                })
                        elif member.role == 'community_admin':
                            community = member.community
                            if community and community.status in [
                                'Pending Super Admin Approval',
                                'Pending Parent Community Approval',
                                'Rejected By Super Admin',
                                'Rejected By Parent Community Admin',
                                'Pending',
                                'Inactive'
                            ]:
                                from rest_framework import serializers
                                raise serializers.ValidationError({
                                    "detail": "Your community registration is under review. Access will be granted after all approval stages are completed."
                                })
                    except Member.DoesNotExist:
                        pass
        except serializers.ValidationError:
            raise
        except Exception:
            pass

        data = super().validate(attrs)
        
        # Check first successful login for community admins
        try:
            member = Member.objects.get(user=self.user)
            if member.role == 'community_admin' and self.user.last_login is None:
                from .emails import send_project_email
                send_project_email(
                    recipient=self.user.email,
                    template_name='first_successful_login',
                    context={'community_name': member.community.name if member.community else 'N/A'},
                    trigger_event='First Successful Login'
                )
        except Exception:
            pass

        user_serializer = UserSerializer(self.user, context={'request': self.context.get('request')})
        
        # Add member profile info
        try:
            member = Member.objects.get(user=self.user)
            logo_url = None
            cover_url = None
            if member.community:
                if member.community.logo:
                    logo_url = member.community.logo.url
                elif member.community.logo_url:
                    logo_url = member.community.logo_url
                if member.community.cover:
                    cover_url = member.community.cover.url
                elif member.community.cover_url:
                    cover_url = member.community.cover_url
            
            permissions_list = member.permissions or []
            if member.custom_role:
                role_perms = member.custom_role.permissions if isinstance(member.custom_role.permissions, list) else []
                member_perms = member.permissions if isinstance(member.permissions, list) else []
                permissions_list = list(set(role_perms) & set(member_perms))
            
            data['member'] = {
                'id': member.id,
                'name': member.name,
                'role': member.role,
                'custom_role_name': member.custom_role.name if member.custom_role else None,
                'permissions': permissions_list,
                'community_id': member.community.id if member.community else None,
                'community_name': member.community.name if member.community else None,
                'community_logo': logo_url,
                'community_cover': cover_url,
                'community_type': member.community.type if member.community else None,
                'parent_community_name': (member.community.parent.name if member.community and member.community.parent else None),
                'parent_community_type': (member.community.parent.type if member.community and member.community.parent else None),
                'parent_community_id': (member.community.parent.id if member.community and member.community.parent else None),
                'status': member.status
            }
        except Member.DoesNotExist:
            if self.user.is_superuser:
                data['member'] = {
                    'id': 'superadmin',
                    'name': self.user.get_full_name() or 'Super Admin',
                    'role': 'super_admin',
                    'community_id': None,
                    'status': 'Verified'
                }
            else:
                data['member'] = None
            
        data['user'] = user_serializer.data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            password = request.data.get('password')
            if not password:
                return Response({"password": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user = serializer.save()
            user.set_password(password)
            user.save()
            
            community_id = request.data.get('communityId')
            community = None
            if community_id:
                try:
                    community = Community.objects.get(id=community_id)
                except (Community.DoesNotExist, ValueError):
                    pass
            
            if not community:
                community = Community.objects.first()
                if not community:
                    community = Community.objects.create(
                        name="Rampara Ahir Samaj",
                        type="Subsidiary",
                        state="Gujarat",
                        district="Amreli",
                        taluka="Rajula",
                        village="Rampara",
                        plan="Pro",
                        status="Active",
                        gradient="from-blue-600 to-indigo-700"
                    )
            
            name = request.data.get('name', user.username)
            role = request.data.get('role', 'member')
            aadhaar = request.data.get('aadhaar', '')
            
            avatar = request.FILES.get('avatar')
            aadhaar_photo = request.FILES.get('aadhaar_photo')
            
            member = Member.objects.create(
                user=user,
                name=name,
                email=user.email or f"{user.username}@example.com",
                phone=request.data.get('phone', '+91 9999999999'),
                avatar=avatar,
                aadhaar_photo=aadhaar_photo,
                age=request.data.get('age'),
                gender=request.data.get('gender', 'Male'),
                state=request.data.get('state', 'Gujarat'),
                district=request.data.get('district', 'Amreli'),
                taluka=request.data.get('taluka', 'Rajula'),
                village=request.data.get('village', 'Rampara'),
                profession=request.data.get('profession', 'Software Engineer'),
                education=request.data.get('education', 'B.Tech'),
                school=request.data.get('school'),
                college=request.data.get('college'),
                degree=request.data.get('degree'),
                field_of_study=request.data.get('fieldOfStudy'),
                passing_year=request.data.get('passingYear'),
                profession_type=request.data.get('professionType'),
                job_title=request.data.get('jobTitle'),
                company=request.data.get('company'),
                industry=request.data.get('industry'),
                salary=request.data.get('salary'),
                business_name=request.data.get('businessName'),
                business_category=request.data.get('businessCategory'),
                gst_no=request.data.get('gstNo'),
                business_years=request.data.get('businessYears'),
                community=community,
                role=role,
                status='Verified' if role in ['community_admin', 'super_admin'] else 'Pending',
                email_verified=False,
                aadhaar=aadhaar,
                aadhaar_status='Pending'
            )
            
            # If profession is Business, also create a Business object
            if request.data.get('professionType') == 'Business':
                from django.core.files.storage import default_storage
                import json
                import uuid
                
                # Parse hours
                hours_raw = request.data.get('businessHours')
                hours_dict = {}
                if hours_raw:
                    try:
                        hours_dict = json.loads(hours_raw) if isinstance(hours_raw, str) else hours_raw
                    except Exception:
                        pass
                
                # Socials
                socials_dict = {
                    'instagram': request.data.get('businessInstagram', ''),
                    'facebook': request.data.get('businessFacebook', ''),
                    'youtube': request.data.get('businessYoutube', ''),
                    'linkedin': request.data.get('businessLinkedin', '')
                }
                
                # Process Business Gallery Uploads
                gallery_urls = []
                for key in request.FILES:
                    if key.startswith('business_gallery_'):
                        file = request.FILES[key]
                        ext = os.path.splitext(file.name)[1]
                        filename = f"businesses/gallery/{uuid.uuid4()}{ext}"
                        saved_path = default_storage.save(filename, file)
                        url_path = default_storage.url(saved_path)
                        gallery_urls.append(url_path)
                
                # Create Business Object
                Business.objects.create(
                    name=request.data.get('businessName', 'My Business'),
                    category=request.data.get('businessCategory', 'Other'),
                    owner=name,
                    location=request.data.get('businessAddress', request.data.get('village', '')),
                    phone=request.data.get('businessPhone', request.data.get('phone', '')),
                    whatsapp=request.data.get('businessWhatsapp', ''),
                    email=request.data.get('businessEmail', ''),
                    website=request.data.get('businessWebsite', ''),
                    desc=request.data.get('businessDesc', ''),
                    address=request.data.get('businessAddress', ''),
                    city=request.data.get('businessCity', ''),
                    state=request.data.get('businessState', ''),
                    pincode=request.data.get('businessPincode', ''),
                    gst_no=request.data.get('gstNo', ''),
                    business_years=request.data.get('businessYears', ''),
                    hours=hours_dict,
                    socials=socials_dict,
                    gallery=gallery_urls,
                    img=request.FILES.get('business_logo'),
                    community=community,
                    status='PENDING'
                )
            
            # Generate and send registration OTP
            otp_code = str(random.randint(100000, 999999))
            expiry_time = datetime.datetime.now() + datetime.timedelta(minutes=10)
            OTP_STORE[user.email.strip().lower()] = {
                'otp': otp_code,
                'expiry_time': expiry_time,
                'attempt_count': 0,
                'purpose': 'register'
            }
            import sys
            print(f"\n{'='*60}")
            print(f"[OTP] REGISTRATION OTP")
            print(f"[OTP] Email   : {user.email}")
            print(f"[OTP] Code    : {otp_code}")
            print(f"[OTP] Expiry  : {expiry_time}")
            print(f"{'='*60}\n")
            sys.stdout.flush()
            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=user.email,
                    template_name='forgot_password_otp',
                    context={'otp_code': otp_code},
                    trigger_event='Registration OTP'
                )
            except Exception as e:
                print(f"Failed to send registration email: {e}")
            
            user_data = UserSerializer(user, context={'request': request}).data
            return Response(user_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        try:
            member = Member.objects.get(user=request.user)
            member_data = MemberSerializer(member, context={'request': request}).data
            # Enrich with full community context
            if member.community:
                c = member.community
                import time
                t = int(time.time())
                logo_url = None
                cover_url = None
                if c.logo:
                    logo_url = f"{request.build_absolute_uri(c.logo.url)}?t={t}"
                elif c.logo_url:
                    logo_url = f"{c.logo_url}?t={t}" if "?" in c.logo_url else f"{c.logo_url}?t={t}"
                if c.cover:
                    cover_url = f"{request.build_absolute_uri(c.cover.url)}?t={t}"
                elif c.cover_url:
                    cover_url = f"{c.cover_url}?t={t}" if "?" in c.cover_url else f"{c.cover_url}?t={t}"
                member_data['community_name'] = c.name
                member_data['community_logo'] = logo_url
                member_data['community_cover'] = cover_url
                member_data['community_type'] = c.type
                member_data['community_id'] = c.id
                member_data['parent_community_name'] = c.parent.name if c.parent else None
                member_data['parent_community_type'] = c.parent.type if c.parent else None
                member_data['parent_community_id'] = c.parent.id if c.parent else None
        except Member.DoesNotExist:
            member_data = None
            
        data = serializer.data
        data['member'] = member_data
        return Response(data)

# ========================
# ViewSets
# ========================

class CommunityViewSet(viewsets.ModelViewSet):
    serializer_class = CommunitySerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        print(f"\n[COMMUNITY IMAGE LOAD]")
        print(f"Community ID: {instance.id}")
        logo_url = instance.logo.url if instance.logo else instance.logo_url
        cover_url = instance.cover.url if instance.cover else instance.cover_url
        print(f"Logo URL: {logo_url if logo_url else 'None'}")
        print(f"Banner URL: {cover_url if cover_url else 'None'}\n")
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """Return unlimited-depth community tree."""
        state = request.query_params.get('state')
        district = request.query_params.get('district')
        search = request.query_params.get('search')

        def get_community_stats(community):
            from django.db.models import Sum
            members = Member.objects.filter(community=community)
            total_members = members.count()
            male_members = members.filter(gender='Male').count()
            female_members = members.filter(gender='Female').count()
            active_events = Event.objects.filter(community=community).count()
            matrimony_profiles = MatrimonyProfile.objects.filter(community=community).count()
            jobs_posted = Job.objects.filter(community=community).count()
            donations = Donation.objects.filter(campaign__community=community)
            donations_sum = donations.aggregate(Sum('amount'))['amount__sum'] or 0
            total_subs = community.subsidiaries.count()
            return {
                'total_members': total_members,
                'male_members': male_members,
                'female_members': female_members,
                'active_events': active_events,
                'matrimony_profiles': matrimony_profiles,
                'jobs_posted': jobs_posted,
                'donations_sum': donations_sum,
                'total_subsidiaries': total_subs,
            }

        def build_tree(community, current_level=1):
            """Recursively build unlimited-depth tree."""
            children = []
            for child in community.subsidiaries.filter(deleted_at__isnull=True):
                children.append(build_tree(child, current_level + 1))

            logo_url = None
            if community.logo:
                logo_url = request.build_absolute_uri(community.logo.url)
            elif community.logo_url:
                logo_url = community.logo_url

            admin_member = Member.objects.filter(community=community, role='community_admin').first()
            return {
                'id': community.id,
                'name': community.name,
                'type': community.type,
                'status': community.status,
                'state': community.state,
                'district': community.district,
                'logo_url': logo_url,
                'level': current_level,
                'path': community.path,
                'parent_id': community.parent_id,
                'parent_name': community.parent.name if community.parent else None,
                'admin_name': admin_member.name if admin_member else 'N/A',
                'stats': get_community_stats(community),
                'children': children,
                'children_count': len(children),
            }

        user = request.user
        is_super_admin = user.is_superuser
        member = None
        try:
            member = user.member_profile
            if member.role == 'super_admin':
                is_super_admin = True
        except Exception:
            pass

        if is_super_admin:
            roots = Community.objects.filter(parent__isnull=True)
        else:
            if member and member.community:
                # Show from the community's own root upward
                root_community = member.community
                while root_community.parent:
                    root_community = root_community.parent
                roots = Community.objects.filter(id=root_community.id)
            else:
                roots = Community.objects.none()
                
        if state:
            roots = roots.filter(state__icontains=state)
        if district:
            roots = roots.filter(district__icontains=district)
        if search:
            # For search, return flat matching list
            matches = Community.objects.filter(name__icontains=search)
            return Response([build_tree(c, c.level) for c in matches])

        data = [build_tree(root, 1) for root in roots]
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def ancestors(self, request, pk=None):
        """Return ancestor chain from root to this community."""
        community = self.get_object()
        result = []
        node = community.parent
        while node:
            logo_url = None
            if node.logo:
                logo_url = request.build_absolute_uri(node.logo.url)
            elif node.logo_url:
                logo_url = node.logo_url
            result.append({
                'id': node.id,
                'name': node.name,
                'type': node.type,
                'status': node.status,
                'logo_url': logo_url,
                'level': node.level,
                'children_count': node.subsidiaries.count(),
            })
            node = node.parent
        return Response(list(reversed(result)))

    def get_queryset(self):
        queryset = Community.objects.all().order_by('name')
        
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        
        if status_param:
            queryset = queryset.filter(status=status_param)
        if type_param:
            if type_param in ['Super', 'Super Community']:
                queryset = queryset.filter(type__in=['Super', 'Super Community'])
            elif type_param in ['Subsidiary', 'Subsidiary Community']:
                queryset = queryset.filter(type__in=['Subsidiary', 'Subsidiary Community'])
            else:
                queryset = queryset.filter(type=type_param)
                
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        user = request.user
        is_super = user.is_superuser
        try:
            if user.member_profile.role == 'super_admin':
                is_super = True
        except Exception:
            pass
            
        if not is_super:
            return Response({"detail": "Only platform super admins can delete communities."}, status=403)
            
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.status = 'Inactive'
        instance.save()
        
        # Deactivate all users of this community
        from django.contrib.auth.models import User
        from api.models import Member
        user_ids = Member.objects.filter(community=instance).values_list('user_id', flat=True)
        User.objects.filter(id__in=user_ids).update(is_active=False)
        
        return Response({"detail": "Community successfully deleted."}, status=204)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Extract admin fields before passing to serializer
        admin_name = data.pop('admin_name', None)
        admin_email = data.pop('admin_email', None)
        admin_phone = data.pop('admin_phone', None)
        admin_password = data.pop('admin_password', None)

        # Handle MultiValueDict from FormData — extract single values
        if isinstance(admin_name, list): admin_name = admin_name[0] if admin_name else None
        if isinstance(admin_email, list): admin_email = admin_email[0] if admin_email else None
        if isinstance(admin_phone, list): admin_phone = admin_phone[0] if admin_phone else None
        if isinstance(admin_password, list): admin_password = admin_password[0] if admin_password else None

        # Derive type from parent field — parent presence is the source of truth
        parent_val = data.get('parent')
        if isinstance(parent_val, list): parent_val = parent_val[0] if parent_val else None
        if parent_val and str(parent_val).strip():
            data['type'] = 'Subsidiary'
        else:
            data['type'] = 'Super'
            data['parent'] = None

        data['status'] = 'Pending Super Admin Approval'

        # Ensure optional text fields are stored as None/NULL if empty
        optional_fields = [
            'caste', 'sub_caste', 'email', 'phone', 'est_year',
            'registration_no', 'office_address', 'website',
            'vision_mission', 'social_fb', 'social_tw', 'social_yt', 'doc_name',
            'logo_url', 'cover_url'
        ]
        for field in optional_fields:
            val = data.get(field)
            if isinstance(val, list): val = val[0] if val else None
            data[field] = val if val not in ("", None) else None

        # Serialize and validate text fields only (files handled separately below)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        community = serializer.save()

        # Save uploaded image files directly to the model after initial save
        # This is the reliable pattern for multipart ImageField uploads in DRF
        needs_save = False
        if 'logo' in request.FILES:
            community.logo = request.FILES['logo']
            community.logo_url = community.logo.url
            needs_save = True
        if 'cover' in request.FILES:
            community.cover = request.FILES['cover']
            community.cover_url = community.cover.url
            needs_save = True
        if needs_save:
            community.save(update_fields=[f for f in ['logo', 'cover', 'logo_url', 'cover_url'] if f in request.FILES or f in ['logo_url', 'cover_url']])
            
        print("\n[UPLOAD SUCCESS]")
        print(f"Community: {community.name}")
        print(f"Logo: {community.logo.path if community.logo else 'None'}")
        print(f"Cover: {community.cover.path if community.cover else 'None'}\n")
        
        if admin_email and admin_password:
            user, created = User.objects.get_or_create(
                username=admin_email,
                defaults={
                    'email': admin_email,
                    'is_active': True
                }
            )
            # Always update or set password to ensure it matches the registration form
            user.set_password(admin_password)
            user.is_active = True
            user.save()
                
            member, member_created = Member.objects.get_or_create(
                user=user,
                defaults={
                    'name': admin_name or admin_email.split('@')[0],
                    'email': admin_email,
                    'phone': admin_phone or '',
                    'community': community,
                    'role': 'community_admin',
                    'status': 'Pending',
                    'email_verified': False,
                    'profession': 'Community Administrator',
                    'education': 'N/A',
                    'gender': 'Other'
                }
            )
            if not member_created:
                member.community = community
                member.role = 'community_admin'
                member.status = 'Pending'
                member.email_verified = False
                if admin_name:
                    member.name = admin_name
                if admin_phone:
                    member.phone = admin_phone
                member.save()

            # Generate and send registration OTP
            otp_code = str(random.randint(100000, 999999))
            expiry_time = datetime.datetime.now() + datetime.timedelta(minutes=10)
            OTP_STORE[admin_email.strip().lower()] = {
                'otp': otp_code,
                'expiry_time': expiry_time,
                'attempt_count': 0,
                'purpose': 'register'
            }
            import sys
            print(f"\n{'='*60}")
            print(f"[OTP] COMMUNITY ADMIN REGISTRATION OTP")
            print(f"[OTP] Email   : {admin_email}")
            print(f"[OTP] Code    : {otp_code}")
            print(f"[OTP] Expiry  : {expiry_time}")
            print(f"{'='*60}\n")
            sys.stdout.flush()
            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=admin_email,
                    template_name='forgot_password_otp',
                    context={'otp_code': otp_code},
                    trigger_event='Registration OTP'
                )
            except Exception as e:
                print(f"Failed to send registration email: {e}")

        CommunityApprovalHistory.objects.create(
            community=community,
            approval_level="Submission",
            status="Pending Super Admin Approval",
            remarks="Community registration submitted."
        )

        from .emails import send_project_email
        import datetime
        reg_date_str = datetime.date.today().strftime('%Y-%m-%d')

        # Send email to Community Admin
        if admin_email:
            send_project_email(
                recipient=admin_email,
                template_name='community_registration_submitted',
                context={
                    'community_name': community.name,
                    'community_type': community.type
                },
                trigger_event='Community Registration Submitted'
            )

        superadmins = User.objects.filter(is_superuser=True)
        for sa in superadmins:
            Notification.objects.create(
                recipient=sa,
                title="New Community Registration",
                message=f"A new community '{community.name}' has been submitted for approval.",
                notification_type="community_registration"
            )
            # Send email to Super Admin
            if sa.email:
                send_project_email(
                    recipient=sa.email,
                    template_name='super_admin_new_approval_request',
                    context={
                        'community_name': community.name,
                        'community_type': community.type,
                        'registration_date': reg_date_str,
                        'admin_name': admin_name or admin_email.split('@')[0],
                        'admin_email': admin_email or ''
                    },
                    trigger_event='New Community Approval Request'
                )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check permissions
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        is_authorized = user.is_superuser
        if not is_authorized:
            try:
                member = user.member_profile
                if member.role == 'super_admin' or (member.role == 'community_admin' and member.community_id == instance.id):
                    is_authorized = True
            except Exception:
                pass
                
        if not is_authorized:
            return Response({'detail': 'You do not have permission to edit this community.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        
        optional_fields = [
            'name', 'desc', 'vision_mission', 'office_address', 'website', 
            'email', 'phone', 'social_fb', 'social_tw', 'social_yt',
            'caste', 'sub_caste', 'est_year', 'registration_no',
            'state', 'district', 'taluka', 'village'
        ]
        
        changed_fields = []
        for field in optional_fields:
            if field in data:
                val = data.get(field)
                if isinstance(val, list): val = val[0] if val else None
                if val == "": val = None
                
                old_val = getattr(instance, field)
                if str(old_val or '') != str(val or ''):
                    changed_fields.append(field)
                
                data[field] = val

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        needs_save = False
        if 'logo' in request.FILES:
            instance.logo = request.FILES['logo']
            if 'logo' not in changed_fields: changed_fields.append('logo')
            needs_save = True
        if 'cover' in request.FILES:
            instance.cover = request.FILES['cover']
            if 'cover' not in changed_fields: changed_fields.append('cover')
            needs_save = True
            
        if needs_save:
            instance.save(update_fields=[f for f in ['logo', 'cover'] if f in request.FILES])
            if 'logo' in request.FILES:
                instance.logo_url = request.build_absolute_uri(instance.logo.url)
            if 'cover' in request.FILES:
                instance.cover_url = request.build_absolute_uri(instance.cover.url)
            instance.save(update_fields=['logo_url', 'cover_url'])
            
        logo_url = instance.logo_url if instance.logo else instance.logo_url
        cover_url = request.build_absolute_uri(instance.cover.url) if instance.cover else instance.cover_url
        print(f"\n[COMMUNITY UPDATE REQUEST]\nCommunity ID: {instance.id}\n")
        print(f"[DATABASE UPDATED]\nlogo_url={logo_url}\ncover_url={cover_url}\n")
            
        if changed_fields:
            CommunityActivityLog.objects.create(
                community=instance,
                updated_by=request.user if request.user.is_authenticated else None,
                changed_fields=changed_fields
            )
            
        fresh_serializer = self.get_serializer(instance)
        return Response(fresh_serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        community = self.get_object()
        user = request.user
        
        is_super_admin = user.is_superuser
        try:
            member = user.member_profile
            if member.role == 'super_admin':
                is_super_admin = True
        except Member.DoesNotExist:
            member = None
            
        remarks = request.data.get('remarks', 'Approved.')

        community_admins = Member.objects.filter(community=community, role='community_admin')

        # STEP 1: Super Admin initial approval — move to parent's pending queue
        if community.status == 'Pending Super Admin Approval':
            if not is_super_admin:
                return Response({'detail': 'Only Super Admins can perform the initial approval.'}, status=status.HTTP_403_FORBIDDEN)

            if community.parent:
                # Has a parent — needs parent's approval next
                community.status = 'Pending Parent Community Approval'
                community.save()

                CommunityApprovalHistory.objects.create(
                    community=community,
                    approval_level="Super Admin",
                    approved_by=user,
                    status="Pending Parent Community Approval",
                    remarks=remarks
                )

                for admin_member in community_admins:
                    if admin_member.user:
                        Notification.objects.create(
                            recipient=admin_member.user,
                            title="Super Admin Approved",
                            message=f"Your community '{community.name}' was approved by the Super Admin. Pending approval from parent community '{community.parent.name}'.",
                            notification_type="approval"
                        )

                parent_admins = Member.objects.filter(community=community.parent, role='community_admin')
                import datetime
                reg_date_str = datetime.date.today().strftime('%Y-%m-%d')
                for pa in parent_admins:
                    if pa.user:
                        Notification.objects.create(
                            recipient=pa.user,
                            title="New Community Approval Required",
                            message=f"Community '{community.name}' is requesting to join under your community. Please review.",
                            notification_type="community_registration"
                        )
                        if pa.user.email:
                            from .emails import send_project_email
                            sub_admin = community_admins.first()
                            send_project_email(
                                recipient=pa.user.email,
                                template_name='parent_community_approval_request',
                                context={
                                    'community_name': community.name,
                                    'admin_name': sub_admin.name if sub_admin else 'Community Admin',
                                    'admin_email': sub_admin.email if sub_admin else '',
                                    'registration_date': reg_date_str
                                },
                                trigger_event='Parent Community Approval Request'
                            )

                return Response({'status': 'pending_parent_approval', 'detail': f"Approved by Super Admin. Forwarded to parent community '{community.parent.name}' for final approval."})
            else:
                # Root community — just approve it
                community.status = 'Approved'
                community.save()

                for admin_member in community_admins:
                    if admin_member.user:
                        admin_member.user.is_active = True
                        admin_member.user.save()
                    admin_member.status = 'Active'
                    admin_member.save()
                    if admin_member.user:
                        Notification.objects.create(
                            recipient=admin_member.user,
                            title="Community Approved",
                            message=f"Congratulations! Your root community '{community.name}' has been approved.",
                            notification_type="approval"
                        )
                        if admin_member.user.email:
                            from .emails import send_project_email
                            send_project_email(
                                recipient=admin_member.user.email,
                                template_name='super_community_approved',
                                context={'community_name': community.name},
                                trigger_event='Root Community Approved'
                            )

                CommunityApprovalHistory.objects.create(
                    community=community,
                    approval_level="Super Admin",
                    approved_by=user,
                    status="Approved",
                    remarks=remarks
                )
                return Response({'status': 'approved', 'detail': 'Root community approved successfully.'})

        # STEP 2: Parent Community Admin approval
        elif community.status == 'Pending Parent Community Approval':
            if not community.parent:
                return Response({'detail': 'This community has no parent assigned.'}, status=status.HTTP_400_BAD_REQUEST)

            is_parent_admin = False
            if member and member.role == 'community_admin' and member.community == community.parent:
                is_parent_admin = True
            if is_super_admin:
                is_parent_admin = True

            if not is_parent_admin:
                return Response({'detail': 'Only the direct parent community admin or Super Admin can approve.'}, status=status.HTTP_403_FORBIDDEN)

            community.status = 'Active'
            community.save()

            for admin_member in community_admins:
                if admin_member.user:
                    admin_member.user.is_active = True
                    admin_member.user.save()
                admin_member.status = 'Active'
                admin_member.save()
                if admin_member.user:
                    Notification.objects.create(
                        recipient=admin_member.user,
                        title="Community Activated",
                        message=f"Your community '{community.name}' has been activated under '{community.parent.name}'.",
                        notification_type="approval"
                    )
                    if admin_member.user.email:
                        from .emails import send_project_email
                        send_project_email(
                            recipient=admin_member.user.email,
                            template_name='subsidiary_community_approved',
                            context={'community_name': community.name},
                            trigger_event='Community Activated'
                        )

            CommunityApprovalHistory.objects.create(
                community=community,
                approval_level="Parent Community Admin",
                approved_by=user,
                status="Active",
                remarks=remarks
            )
            return Response({'status': 'active', 'detail': f"Community '{community.name}' activated under '{community.parent.name}'."})

        else:
            return Response({'detail': f'Community is not in an approvable status (current: {community.status}).'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        community = self.get_object()
        user = request.user
        
        is_super_admin = user.is_superuser
        try:
            member = user.member_profile
            if member.role == 'super_admin':
                is_super_admin = True
        except Member.DoesNotExist:
            member = None
            
        remarks = request.data.get('remarks')
        if not remarks or not remarks.strip():
            return Response({'detail': 'Rejection reason is mandatory.'}, status=status.HTTP_400_BAD_REQUEST)
            
        community_admins = Member.objects.filter(community=community, role='community_admin')

        def notify_and_deactivate(reason_msg, template_name, trigger_event, rejection_context):
            for admin_member in community_admins:
                admin_member.status = 'Inactive'
                admin_member.save()
                if admin_member.user:
                    admin_member.user.is_active = False
                    admin_member.user.save()
                    Notification.objects.create(
                        recipient=admin_member.user,
                        title="Community Registration Rejected",
                        message=reason_msg,
                        notification_type="rejection"
                    )
                    if admin_member.user.email:
                        from .emails import send_project_email
                        send_project_email(
                            recipient=admin_member.user.email,
                            template_name=template_name,
                            context=rejection_context,
                            trigger_event=trigger_event
                        )

        if community.status == 'Pending Super Admin Approval':
            if not is_super_admin:
                return Response({'detail': 'Only Super Admins can reject at this stage.'}, status=status.HTTP_403_FORBIDDEN)

            community.status = 'Rejected By Super Admin'
            community.save()

            CommunityApprovalHistory.objects.create(
                community=community, approval_level="Super Admin",
                approved_by=user, status="Rejected By Super Admin", remarks=remarks
            )
            notify_and_deactivate(
                reason_msg=f"Your community '{community.name}' was rejected by the Super Admin. Reason: {remarks}",
                template_name='super_community_rejected',
                trigger_event='Community Rejected by Super Admin',
                rejection_context={'community_name': community.name, 'rejection_reason': remarks}
            )
            return Response({'status': 'rejected', 'detail': 'Community rejected by Super Admin.'})

        elif community.status == 'Pending Parent Community Approval':
            if not community.parent:
                return Response({'detail': 'No parent community assigned.'}, status=status.HTTP_400_BAD_REQUEST)

            is_parent_admin = is_super_admin or (
                member and member.role == 'community_admin' and member.community == community.parent
            )
            if not is_parent_admin:
                return Response({'detail': 'Only the parent community admin or Super Admin can reject.'}, status=status.HTTP_403_FORBIDDEN)

            community.status = 'Rejected By Parent Community Admin'
            community.save()

            CommunityApprovalHistory.objects.create(
                community=community, approval_level="Parent Community Admin",
                approved_by=user, status="Rejected By Parent Community Admin", remarks=remarks
            )
            notify_and_deactivate(
                reason_msg=f"Your community '{community.name}' was rejected by '{community.parent.name}'. Reason: {remarks}",
                template_name='subsidiary_community_rejected',
                trigger_event='Community Rejected by Parent Admin',
                rejection_context={
                    'community_name': community.name,
                    'parent_name': community.parent.name,
                    'rejection_reason': remarks
                }
            )
            return Response({'status': 'rejected', 'detail': f"Community rejected by '{community.parent.name}'."})

        else:
            return Response({'detail': f'Cannot reject at status: {community.status}.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        community = self.get_object()
        return Response({
            'members': community.members.count(),
            'events': community.events.count(),
            'businesses': community.businesses.count(),
            'jobs': community.jobs.count(),
            'news': community.news.count(),
            'campaigns': community.campaigns.count(),
        })

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all().order_by('-joined_date')
    serializer_class = MemberSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = Member.objects.all().order_by('-joined_date')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        role = self.request.query_params.get('role')
        status = self.request.query_params.get('status')
        
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if role:
            queryset = queryset.filter(role=role)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        
        member = serializer.save()
        new_status = member.status
        
        # Trigger email notifications on status change
        if old_status != new_status:
            from .emails import send_project_email
            recipient_email = member.email or (member.user.email if member.user else None)
            if recipient_email:
                if new_status == 'Suspended':
                    send_project_email(
                        recipient=recipient_email,
                        template_name='account_suspended',
                        context={},
                        trigger_event='Account Suspended'
                    )
                elif new_status in ['Active', 'Verified'] and old_status == 'Suspended':
                    send_project_email(
                        recipient=recipient_email,
                        template_name='account_reactivated',
                        context={},
                        trigger_event='Account Reactivated'
                    )
    @action(detail=False, methods=['get'])
    def community_members(self, request):
        community_id = request.query_params.get('community_id') or request.query_params.get('communityId')
        if community_id:
            members = Member.objects.filter(community_id=community_id).order_by('-joined_date')
            serializer = self.get_serializer(members, many=True)
            return Response(serializer.data)
        return Response([], status=status.HTTP_400_BAD_REQUEST)

class CommitteeViewSet(viewsets.ModelViewSet):
    queryset = Committee.objects.all().order_by('since')
    serializer_class = CommitteeSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = Committee.objects.all().order_by('since')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        if community_id:
            queryset = queryset.filter(community_id=community_id)
        return enforce_community_isolation(self.request, queryset)

    def create(self, request, *args, **kwargs):
        data = request.data
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone', '')
        since = data.get('since')
        community_id = data.get('community')
        role_id = data.get('role_id')
        role_name = data.get('designation')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        photo_url = data.get('photo_url', '')

        # Validate required fields
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not name:
            return Response({"detail": "Full name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        if password != confirm_password:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
        if not community_id:
            return Response({"detail": "Community Association is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check user availability
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return Response({"detail": "A user account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve Community
        try:
            community = Community.objects.get(id=community_id)
        except Community.DoesNotExist:
            return Response({"detail": "Community not found."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve Custom Role and Permissions
        custom_role = None
        permissions_list = []
        frontend_permissions = data.get('permissions')
        
        if role_id:
            try:
                custom_role = Role.objects.get(id=role_id)
                role_name = custom_role.name
                role_perms = custom_role.permissions if isinstance(custom_role.permissions, list) else []
                if isinstance(frontend_permissions, list):
                    permissions_list = list(set(role_perms) & set(frontend_permissions))
                else:
                    permissions_list = role_perms
            except Role.DoesNotExist:
                pass
        
        if not custom_role and role_name:
            try:
                custom_role = Role.objects.get(name=role_name)
                role_perms = custom_role.permissions if isinstance(custom_role.permissions, list) else []
                if isinstance(frontend_permissions, list):
                    permissions_list = list(set(role_perms) & set(frontend_permissions))
                else:
                    permissions_list = role_perms
            except Role.DoesNotExist:
                pass

        if not role_name:
            role_name = "Committee Member"

        # 1. Create Django User
        first_name = name.split(' ')[0] if name else ''
        last_name = ' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else ''
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=True
        )

        # 2. Create Member Profile
        member = Member.objects.create(
            user=user,
            name=name,
            email=email,
            phone=phone,
            community=community,
            role='community_admin',
            custom_role=custom_role,
            permissions=permissions_list,
            status='Verified',
            aadhaar_status='Verified'
        )

        # 3. Create Committee record
        if not since:
            import datetime
            since = datetime.date.today()

        committee_member = Committee.objects.create(
            name=name,
            designation=role_name,
            since=since,
            phone=phone,
            email=email,
            photo_url=photo_url,
            community=community,
            role=custom_role
        )

        serializer = self.get_serializer(committee_member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data

        # Fetch associated user/member
        user = None
        member = None
        try:
            user = User.objects.get(email=instance.email)
            member = user.member_profile
        except (User.DoesNotExist, Member.DoesNotExist):
            try:
                user = User.objects.get(username=instance.email)
                member = user.member_profile
            except Exception:
                pass

        response = super().update(request, *args, **kwargs)
        
        if user and member:
            name = data.get('name')
            if name:
                first_name = name.split(' ')[0]
                last_name = ' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else ''
                user.first_name = first_name
                user.last_name = last_name
            
            email = data.get('email')
            if email and email != user.email:
                if not User.objects.filter(username=email).exclude(id=user.id).exists():
                    user.username = email
                    user.email = email
                    member.email = email
            
            user.save()

            phone = data.get('phone')
            if phone:
                member.phone = phone
            
            community_id = data.get('community')
            if community_id:
                try:
                    community = Community.objects.get(id=community_id)
                    member.community = community
                except Community.DoesNotExist:
                    pass

            role_id = data.get('role_id')
            role_name = data.get('designation')
            frontend_permissions = data.get('permissions')
            custom_role = None
            permissions_list = []
            if role_id:
                try:
                    custom_role = Role.objects.get(id=role_id)
                    role_perms = custom_role.permissions if isinstance(custom_role.permissions, list) else []
                    if isinstance(frontend_permissions, list):
                        permissions_list = list(set(role_perms) & set(frontend_permissions))
                    else:
                        permissions_list = role_perms
                except Role.DoesNotExist:
                    pass
            elif role_name:
                try:
                    custom_role = Role.objects.get(name=role_name)
                    role_perms = custom_role.permissions if isinstance(custom_role.permissions, list) else []
                    if isinstance(frontend_permissions, list):
                        permissions_list = list(set(role_perms) & set(frontend_permissions))
                    else:
                        permissions_list = role_perms
                except Role.DoesNotExist:
                    pass
            
            if custom_role:
                member.custom_role = custom_role
                member.permissions = permissions_list
                member.role = 'community_admin'
                instance.role = custom_role
                instance.save()
                
            member.save()

        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            user = User.objects.get(email=instance.email)
            user.delete()
        except User.DoesNotExist:
            try:
                user = User.objects.get(username=instance.email)
                user.delete()
            except User.DoesNotExist:
                pass
        return super().destroy(request, *args, **kwargs)

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-date')
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission, MemberPremiumModulePermission]
    
    def get_queryset(self):
        queryset = Event.objects.all().order_by('-date')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        status = self.request.query_params.get('status')
        
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        events = Event.objects.filter(status='Upcoming').order_by('date')[:5]
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all().order_by('-posted_date')
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission, MemberPremiumModulePermission]

    def get_queryset(self):
        queryset = Job.objects.all().order_by('-posted_date')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        job_type = self.request.query_params.get('type')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if job_type:
            queryset = queryset.filter(type=job_type)
        if category:
            queryset = queryset.filter(category=category)
        if search:
            queryset = queryset.filter(Q(role__icontains=search) | Q(company__icontains=search))
            
        return queryset

    @action(detail=True, methods=['post'], url_path='apply', permission_classes=[permissions.IsAuthenticated])
    def apply(self, request, pk=None):
        job = self.get_object()
        user = request.user
        member = getattr(user, 'member_profile', None)
        applicant_name = member.name if member else user.username
        applicant_email = user.email or (member.email if member else '')

        # Increment applicants count
        job.applicants += 1
        job.save()

        # Send email to Applicant
        from .emails import send_project_email
        send_project_email(
            recipient=applicant_email,
            template_name='job_application_submitted',
            context={
                'job_role': job.role,
                'company_name': job.company
            },
            trigger_event='Job Application Submitted'
        )

        # Send email to Employer (Community Admins)
        if job.community:
            admins = Member.objects.filter(community=job.community, role='community_admin')
            for admin_member in admins:
                if admin_member.user and admin_member.user.email:
                    send_project_email(
                        recipient=admin_member.user.email,
                        template_name='new_application_received',
                        context={
                            'job_role': job.role,
                            'applicant_name': applicant_name,
                            'applicant_email': applicant_email
                        },
                        trigger_event='New Job Application Received'
                    )

        return Response({"status": "applied", "applicants": job.applicants})

class JobApplicationViewSet(viewsets.ModelViewSet):
    queryset = JobApplication.objects.all().order_by('-applied_at')
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = JobApplication.objects.all().order_by('-applied_at')
        
        # Check permissions
        is_admin = False
        viewer_community_id = None
        if hasattr(user, 'member_profile'):
            member = user.member_profile
            if member:
                viewer_community_id = member.community_id
                if member.role in ['community_admin', 'super_admin']:
                    is_admin = True
        
        if user.is_superuser:
            pass
        elif is_admin:
            if viewer_community_id:
                queryset = queryset.filter(community_id=viewer_community_id)
            else:
                queryset = queryset.none()
        else:
            if hasattr(user, 'member_profile') and user.member_profile:
                queryset = queryset.filter(member=user.member_profile)
            else:
                queryset = queryset.none()

        job_id = self.request.query_params.get('job_id') or self.request.query_params.get('jobId')
        if job_id:
            queryset = queryset.filter(job_id=job_id)
            
        return queryset

    def create(self, request, *args, **kwargs):
        job_id = request.data.get('job')
        if not job_id:
            return Response({"error": "Job ID is required"}, status=400)
            
        user = request.user
        member = getattr(user, 'member_profile', None)
        if not member:
            return Response({"error": "Only community members can apply for jobs"}, status=400)
            
        try:
            has_access, err_msg = check_member_feature_limit(member, "JOBS_UNLIMITED_APPLY", increment=True)
            if not has_access:
                return Response({"detail": err_msg, "upgrade_required": True}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass
            
        if JobApplication.objects.filter(job_id=job_id, member=member).exists():
            return Response({"error": "You have already applied for this job"}, status=400)
            
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        member = getattr(user, 'member_profile', None)
        job = serializer.validated_data['job']
        community = job.community or (member.community if member else None)
        
        instance = serializer.save(member=member, community=community)
        
        # Update job applicants counter
        job.applicants += 1
        job.save()
        
        # Member Notification
        if member and member.user:
            Notification.objects.create(
                recipient=member.user,
                title="Job Application Submitted",
                message=f"You have successfully applied for the position of {job.role} at {job.company}.",
                notification_type="job_application"
            )
            # Send Email Notification
            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=member.user.email,
                    template_name='job_application_submitted',
                    context={
                        'job_role': job.role,
                        'company_name': job.company
                    },
                    trigger_event='Job Application Submitted'
                )
            except Exception as e:
                print("Failed to send email to applicant:", e)
                
        # Community Admin Notification
        if community:
            admins = Member.objects.filter(community=community, role='community_admin')
            for admin_member in admins:
                if admin_member.user:
                    Notification.objects.create(
                        recipient=admin_member.user,
                        title="New Job Application",
                        message=f"{instance.full_name} has applied for {job.role}.",
                        notification_type="job_application"
                    )
                    # Send Email Notification
                    try:
                        send_project_email(
                            recipient=admin_member.user.email,
                            template_name='new_application_received',
                            context={
                                'job_role': job.role,
                                'applicant_name': instance.full_name,
                                'applicant_email': instance.email
                            },
                            trigger_event='New Job Application Received'
                        )
                    except Exception as e:
                        print("Failed to send email to admin:", e)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Notify member of status change
        status = instance.status
        recipient_user = instance.member.user
        if recipient_user:
            title = f"Job Application Update: {status}"
            message = f"Your application for {instance.job.role} at {instance.job.company} is now {status}."
            Notification.objects.create(
                recipient=recipient_user,
                title=title,
                message=message,
                notification_type="job_application"
            )
            # Send Email Notification
            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=recipient_user.email,
                    template_name='job_application_status_updated',
                    context={
                        'job_role': instance.job.role,
                        'company_name': instance.job.company,
                        'status': status
                    },
                    trigger_event=f"Job Application Status: {status}"
                )
            except Exception as e:
                print("Failed to send status update email:", e)

class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all().order_by('-featured', '-rating', '-id')
    serializer_class = BusinessSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission, MemberPremiumModulePermission]

    def create(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            try:
                member = request.user.member_profile
                has_access, err_msg = check_member_feature_limit(member, "BUSINESS_PROMOTIONS", increment=True)
                if not has_access:
                    return Response({"detail": err_msg, "upgrade_required": True}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                pass
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.handle_gallery_uploads(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self.handle_gallery_uploads(instance)

    def handle_gallery_uploads(self, instance):
        from django.core.files.storage import default_storage
        from urllib.parse import urlparse
        import json
        import uuid
        
        gallery = []
        raw_gallery = self.request.data.get('gallery')
        if raw_gallery:
            if isinstance(raw_gallery, str):
                try:
                    gallery = json.loads(raw_gallery)
                except Exception:
                    gallery = [raw_gallery]
            elif isinstance(raw_gallery, list):
                gallery = raw_gallery
        else:
            gallery = instance.gallery or []
            if isinstance(gallery, str):
                try:
                    gallery = json.loads(gallery)
                except Exception:
                    gallery = []

        # Clean existing URLs to extract relative path only (remove protocol, host, port, leading slash)
        cleaned_gallery = []
        for item in gallery:
            if isinstance(item, str):
                if item.startswith('http://') or item.startswith('https://'):
                    parsed = urlparse(item)
                    path = parsed.path
                else:
                    path = item
                if path.startswith('/'):
                    path = path[1:]
                if path and path not in cleaned_gallery:
                    cleaned_gallery.append(path)

        # Now handle newly uploaded files
        for key in self.request.FILES:
            if key == 'gallery' or key == 'gallery[]' or key.startswith('gallery_') or key.startswith('business_gallery_'):
                file_list = self.request.FILES.getlist(key)
                for file in file_list:
                    ext = os.path.splitext(file.name)[1]
                    filename = f"businesses/gallery/{uuid.uuid4()}{ext}"
                    saved_path = default_storage.save(filename, file)
                    url_path = default_storage.url(saved_path)
                    
                    if url_path.startswith('http://') or url_path.startswith('https://'):
                        parsed = urlparse(url_path)
                        clean_path = parsed.path
                    else:
                        clean_path = url_path
                    if clean_path.startswith('/'):
                        clean_path = clean_path[1:]
                    
                    if clean_path not in cleaned_gallery:
                        cleaned_gallery.append(clean_path)

        # Always save the updated gallery list so that deletions and additions are both persisted
        instance.gallery = cleaned_gallery
        instance.save(update_fields=['gallery'])
    
    def get_queryset(self):
        user = self.request.user
        is_admin = False
        viewer_community_id = None
        
        if user and user.is_authenticated:
            if user.is_superuser:
                is_admin = True
            else:
                member = getattr(user, 'member_profile', None)
                if member and member.role in ('community_admin', 'super_admin'):
                    is_admin = True
                    viewer_community_id = member.community_id
        
        if is_admin:
            if user.is_superuser:
                queryset = Business.objects.all().order_by('-featured', '-rating', '-id')
            else:
                queryset = Business.objects.filter(
                    Q(community_id=viewer_community_id) | Q(status='VERIFIED')
                ).order_by('-featured', '-rating', '-id')
        else:
            queryset = Business.objects.filter(status='VERIFIED').order_by('-featured', '-rating', '-id')
            
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        category = self.request.query_params.get('category')
        verified = self.request.query_params.get('verified')
        status_param = self.request.query_params.get('status')
        featured_param = self.request.query_params.get('featured')
        search = self.request.query_params.get('search')
        
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if category and category != 'All':
            queryset = queryset.filter(category=category)
        if verified:
            queryset = queryset.filter(verified=verified.lower() == 'true')
        if status_param:
            queryset = queryset.filter(status=status_param)
        if featured_param:
            queryset = queryset.filter(featured=featured_param.lower() == 'true')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(category__icontains=search) | 
                Q(owner__icontains=search) |
                Q(location__icontains=search) |
                Q(city__icontains=search) |
                Q(state__icontains=search)
            )
            
        return queryset

    @action(detail=True, methods=['post'], url_path='track-click', permission_classes=[permissions.AllowAny])
    def track_click(self, request, pk=None):
        business = self.get_object()
        click_type = request.data.get('click_type')
        if click_type == 'view':
            business.views += 1
        elif click_type == 'open':
            business.opens += 1
        elif click_type == 'whatsapp':
            business.whatsapp_clicks += 1
        elif click_type == 'call':
            business.call_clicks += 1
        elif click_type == 'website':
            business.website_visits += 1
        business.save()
        return Response({
            "status": "success", 
            "analytics": {
                "views": business.views,
                "opens": business.opens,
                "whatsapp_clicks": business.whatsapp_clicks,
                "call_clicks": business.call_clicks,
                "website_visits": business.website_visits,
            }
        })

def get_ancestors_for_community(community):
    ancestors = []
    curr = community.parent
    while curr:
        ancestors.append(curr)
        curr = curr.parent
    return ancestors

def get_descendants_for_community(community):
    descendants = []
    stack = list(community.subsidiaries.all())
    while stack:
        curr = stack.pop()
        descendants.append(curr)
        stack.extend(list(curr.subsidiaries.all()))
    return descendants

from rest_framework.pagination import PageNumberPagination

class OptionalPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if 'page' not in request.query_params and 'page_size' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)

class MatrimonyProfileViewSet(viewsets.ModelViewSet):
    queryset = MatrimonyProfile.objects.filter(deleted_at__isnull=True).order_by('-id')
    serializer_class = MatrimonyProfileSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission, MemberPremiumModulePermission]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        user = self.request.user
        queryset = MatrimonyProfile.objects.filter(deleted_at__isnull=True).order_by('-id')
        
        is_admin = False
        if user and user.is_authenticated:
            if user.is_superuser:
                is_admin = True
            else:
                try:
                    member = user.member_profile
                    if member.role in ('community_admin', 'super_admin'):
                        is_admin = True
                except Exception:
                    pass

        if not is_admin:
            if user and user.is_authenticated:
                queryset = queryset.filter(
                    Q(status__in=['Approved', 'Active', 'Featured']) | Q(user=user)
                )
            else:
                queryset = queryset.filter(status__in=['Approved', 'Active', 'Featured'])

        # Exclude blocked users (both ways)
        if user and user.is_authenticated:
            from api.models import BlockedUser
            blocked_user_ids = list(BlockedUser.objects.filter(user=user).values_list('blocked_user_id', flat=True))
            blocked_by_ids = list(BlockedUser.objects.filter(blocked_user=user).values_list('user_id', flat=True))
            all_blocked = set(blocked_user_ids + blocked_by_ids)
            if all_blocked:
                queryset = queryset.exclude(user_id__in=all_blocked)

        return queryset

    def _matching_mode(self):
        return getattr(settings, 'MATCHING_MODE', 'SMART_MATCHING')

    def _open_testing_enabled(self):
        return self._matching_mode() in ('OPEN_TEST', 'OPEN_TESTING')

    def _open_test_profiles(self):
        return MatrimonyProfile.objects.filter(
            deleted_at__isnull=True,
        ).exclude(status='Suspended')


    def _open_testing_exclusion_reason(self, profile, current_user=None):
        if profile.deleted_at is not None:
            return 'deleted_profile'

        if profile.status == 'Suspended':
            return 'status_excluded:Suspended'

        if current_user and current_user.is_authenticated:
            if profile.user_id == current_user.id:
                return 'same_user'

        return None



    def _log_open_testing_recommendation_debug(self, current_user, returned_ids):
        logger = logging.getLogger(__name__)
        all_profiles = MatrimonyProfile.objects.all()
        total_profiles = all_profiles.count()
        active_profiles = all_profiles.filter(status='Active', deleted_at__isnull=True).count()
        approved_profiles = all_profiles.filter(is_verified=True, deleted_at__isnull=True).count()
        open_test_eligible_profiles = self._open_test_profiles().count()
        returned_count = len(returned_ids)

        logger.warning(
            "OPEN_TEST matrimony recommendations: current_user_id=%s total_profiles=%s active_status_profiles=%s approved_profiles=%s eligible_profiles=%s returned_profiles=%s",
            getattr(current_user, 'id', None),
            total_profiles,
            active_profiles,
            approved_profiles,
            open_test_eligible_profiles,
            returned_count,
        )

        for profile in all_profiles.exclude(id__in=returned_ids).select_related('user'):
            reason = self._open_testing_exclusion_reason(profile, current_user)
            if reason:
                logger.warning(
                    "OPEN_TEST matrimony profile excluded: candidate_id=%s candidate_user_id=%s candidate_username=%s reason=%s status=%s is_verified=%s deleted=%s",
                    profile.id,
                    profile.user_id,
                    getattr(profile.user, 'username', None),
                    reason,
                    profile.status,
                    profile.is_verified,
                    profile.deleted_at is not None,
                )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        visible_profiles = []
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        for profile in queryset:
            if profile.deleted_at is not None:
                continue
            if PrivacyVisibilityEngine.canDiscoverProfile(profile, request.user):
                visible_profiles.append(profile)
        page = self.paginate_queryset(visible_profiles)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(visible_profiles, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        if not PrivacyVisibilityEngine.canViewProfile(instance, request.user):
            return Response({'detail': 'You do not have permission to view this profile.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        old_profile = self.get_object()
        old_status = old_profile.status
        old_notes = old_profile.review_notes
        
        new_status = serializer.validated_data.get('status', old_status)
        if new_status in ('Active', 'Approved', 'Featured') and not old_profile.is_verified:
            serializer.validated_data['is_verified'] = True

        # Save updated model
        profile = serializer.save()
        
        # Log status/notes changes
        changes = []
        if old_status != profile.status:
            changes.append(f"Status changed from '{old_status}' to '{profile.status}'")
        if old_notes != profile.review_notes:
            changes.append("Review notes updated")
            
        if changes:
            MatrimonyAuditLog.objects.create(
                profile=profile,
                action="Admin Review Update",
                performed_by=self.request.user if self.request.user and self.request.user.is_authenticated else None,
                details="; ".join(changes)
            )

    @action(detail=False, methods=['get'], url_path='admin-stats')
    def admin_stats(self, request):
        try:
            is_admin = request.user.is_superuser or request.user.member_profile.role in ('community_admin', 'super_admin')
        except Exception:
            is_admin = False
            
        if not is_admin:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        community_id = request.query_params.get('community_id') or request.query_params.get('communityId')
        if not community_id:
            try:
                community_id = request.user.member_profile.community_id
            except Exception:
                pass
                
        if not community_id:
            return Response({"detail": "community_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        profiles = MatrimonyProfile.objects.filter(community_id=community_id, deleted_at__isnull=True)
        
        # Calculate stats
        from django.db.models import Count, Q
        stats = profiles.aggregate(
            total_profiles=Count('id'),
            ready_for_review=Count('id', filter=Q(status='Ready For Review')),
            active=Count('id', filter=Q(status='Active')),
            featured=Count('id', filter=Q(status='Featured')),
            rejected=Count('id', filter=Q(status='Rejected'))
        )
        total_profiles = stats['total_profiles']
        ready_for_review = stats['ready_for_review']
        active = stats['active']
        featured = stats['featured']
        rejected = stats['rejected']
        
        profile_ids = list(profiles.values_list('id', flat=True))
        
        interests_sent = InterestRequest.objects.filter(sender_id__in=profile_ids).count()
        
        matches = InterestRequest.objects.filter(
            Q(sender_id__in=profile_ids) | Q(receiver_id__in=profile_ids),
            status='Accepted'
        ).distinct().count()
        
        return Response({
            "total_profiles": total_profiles,
            "ready_for_review": ready_for_review,
            "active_profiles": active,
            "featured_profiles": featured,
            "rejected_profiles": rejected,
            "total_interests_sent": interests_sent,
            "total_matches": matches,
        })

    
    def get_queryset(self):
        user = self.request.user
        queryset = MatrimonyProfile.objects.filter(deleted_at__isnull=True)

        if user and user.is_authenticated:
            my_profile = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()
            user._cached_matrimony_profile = my_profile
            if my_profile:
                interests = InterestRequest.objects.filter(
                    Q(sender=my_profile) | Q(receiver=my_profile)
                ).values_list('sender_id', 'receiver_id', 'status')
                user._cached_interests = set(interests)

        # Apply Global Search & Filters
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        gender = self.request.query_params.get('gender')
        status_param = self.request.query_params.get('status')
        caste = self.request.query_params.get('caste')
        sub_caste = self.request.query_params.get('sub_caste')
        state = self.request.query_params.get('state')
        city = self.request.query_params.get('city')
        marital_status = self.request.query_params.get('marital_status')
        education = self.request.query_params.get('education')
        profession = self.request.query_params.get('profession') or self.request.query_params.get('occupation')
        income = self.request.query_params.get('income')
        religion = self.request.query_params.get('religion')
        verified_only = self.request.query_params.get('verified_only') or self.request.query_params.get('verifiedOnly')
        premium_only = self.request.query_params.get('premium_only') or self.request.query_params.get('premiumOnly')
        with_photo = self.request.query_params.get('with_photo') or self.request.query_params.get('withPhoto')
        age_min = self.request.query_params.get('age_min') or self.request.query_params.get('ageMin')
        age_max = self.request.query_params.get('age_max') or self.request.query_params.get('ageMax')
        search = self.request.query_params.get('search')

        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if gender:
            queryset = queryset.filter(gender=gender)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if caste and caste != 'Any':
            queryset = queryset.filter(caste__icontains=caste)
        if sub_caste and sub_caste != 'Any':
            queryset = queryset.filter(sub_caste__icontains=sub_caste)
        if state and state != 'Any':
            queryset = queryset.filter(state__icontains=state)
        if city and city != 'Any':
            queryset = queryset.filter(city__icontains=city)
        if marital_status:
            queryset = queryset.filter(marital_status__iexact=marital_status)
        if education and education != 'Any':
            queryset = queryset.filter(education__icontains=education)
        if profession:
            queryset = queryset.filter(profession__icontains=profession)
        if income:
            queryset = queryset.filter(income__icontains=income)
        if religion:
            queryset = queryset.filter(religion__icontains=religion)
        if verified_only and verified_only.lower() == 'true':
            queryset = queryset.filter(is_verified=True)
        if premium_only and premium_only.lower() == 'true':
            queryset = queryset.filter(community__plan__in=['Pro', 'Enterprise'])
        if with_photo and with_photo.lower() == 'true':
            queryset = queryset.filter(Q(photos__isnull=False) | Q(photo__isnull=False) | Q(photo_url__isnull=False)).distinct()
        if age_min:
            queryset = queryset.filter(age__gte=int(age_min))
        if age_max:
            queryset = queryset.filter(age__lte=int(age_max))
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(caste__icontains=search) | 
                Q(education__icontains=search) | 
                Q(profession__icontains=search) |
                Q(city__icontains=search)
            )

        return queryset.order_by('-id')

    def _normalize_preference_list(self, value):
        if not value:
            return []
        if isinstance(value, str):
            return [item.strip().lower() for item in value.split(',') if item.strip()]
        try:
            return [str(item).strip().lower() for item in value if str(item).strip()]
        except Exception:
            return [str(value).strip().lower()]

    def _normalize_gender_preference(self, value):
        if not value:
            return None
        normalized = str(value).strip()
        lowered = normalized.lower()
        if lowered in ('female', 'female only', 'bride profiles', 'bride'):
            return 'Female'
        if lowered in ('male', 'male only', 'groom profiles', 'groom'):
            return 'Male'
        if normalized in ('Female', 'Male'):
            return normalized
        return None

    def _profile_is_active_and_approved(self, profile):
        return bool(profile and profile.status in ('Approved', 'Active', 'Featured') and profile.is_verified and profile.deleted_at is None)

    def _load_partner_preference(self, profile, user):
        if profile:
            if hasattr(profile, 'partner_preference'):
                try:
                    return profile.partner_preference
                except PartnerPreference.DoesNotExist:
                    pass
            else:
                try:
                    return PartnerPreference.objects.get(profile=profile)
                except PartnerPreference.DoesNotExist:
                    pass
        if user:
            try:
                return PartnerPreference.objects.get(user=user)
            except PartnerPreference.DoesNotExist:
                pass
        return None

    def _profile_visibility_reason(self, profile, viewer_user, viewer_profile=None):
        if viewer_user and viewer_user.is_authenticated and profile.user_id == viewer_user.id:
            return True, 'owner'

        visibility_type = getattr(profile, 'visibility_type', None) or 'COMMUNITY_NETWORK'

        if visibility_type == 'PRIVATE':
            if not viewer_profile:
                return False, 'private_requires_viewer_profile'
            has_accepted_interest = InterestRequest.objects.filter(
                Q(sender=profile, receiver=viewer_profile, status='Accepted') |
                Q(sender=viewer_profile, receiver=profile, status='Accepted')
            ).exists()
            if not has_accepted_interest:
                return False, 'private_without_accepted_interest'
            return True, 'private_accepted_interest'

        # For non-private visibility types: PLATFORM_WIDE, COMMUNITY_NETWORK, CUSTOM_AUDIENCE
        if visibility_type in ('PLATFORM_WIDE', 'COMMUNITY_NETWORK', 'CUSTOM_AUDIENCE'):
            # Resolve viewer community (required for COMMUNITY_NETWORK and CUSTOM_AUDIENCE)
            viewer_community = getattr(viewer_profile, 'community', None)
            if not viewer_community and viewer_profile:
                comm_id = getattr(viewer_profile, 'community_id', None)
                if comm_id:
                    try:
                        from api.models import Community
                        viewer_community = Community.objects.get(id=comm_id)
                    except Exception:
                        pass

            # 1. COMMUNITY_NETWORK scope checks — community membership required
            if visibility_type == 'COMMUNITY_NETWORK':
                if not viewer_community:
                    return False, 'missing_viewer_community'
                hierarchy_scope = getattr(profile, 'hierarchy_scope', 'My Community')
                profile_community = getattr(profile, 'community', None)
                if not profile_community:
                    return False, 'missing_candidate_community'

                allowed_ids = {profile_community.id}
                if hierarchy_scope == 'Parent Community':
                    if profile_community.parent_id:
                        allowed_ids.add(profile_community.parent_id)
                elif hierarchy_scope == 'Child Communities':
                    allowed_ids.update(c.id for c in get_descendants_for_community(profile_community))
                elif hierarchy_scope in ('Entire Hierarchy Chain', 'Entire Network'):
                    allowed_ids.update(c.id for c in get_ancestors_for_community(profile_community))
                    allowed_ids.update(c.id for c in get_descendants_for_community(profile_community))
                elif hierarchy_scope == 'Selected Communities':
                    allowed_ids = set(profile.selected_communities.values_list('id', flat=True))
                elif hierarchy_scope not in ('My Community', 'My Community Only'):
                    allowed_ids = {profile_community.id}

                if viewer_community.id not in allowed_ids:
                    return False, f'community_network_scope_mismatch:{hierarchy_scope}'

            # 2. CUSTOM_AUDIENCE selected_communities scope
            if visibility_type == 'CUSTOM_AUDIENCE':
                if not viewer_community:
                    return False, 'missing_viewer_community'
                if profile.selected_communities.exists() and not profile.selected_communities.filter(id=viewer_community.id).exists():
                    return False, 'custom_audience_selected_community_mismatch'

            # 3. General target audience filters (apply to PLATFORM_WIDE, COMMUNITY_NETWORK, CUSTOM_AUDIENCE)
            # Only apply target_communities filter when viewer community is known
            if viewer_community and profile.target_communities.exists() and not profile.target_communities.filter(id=viewer_community.id).exists():
                return False, 'target_communities_mismatch'

            if profile.target_castes:
                allowed_castes = self._normalize_preference_list(profile.target_castes)
                if allowed_castes and not self._value_matches_exact_list(getattr(viewer_profile, 'caste', ''), allowed_castes):
                    return False, 'target_caste_mismatch'

            if profile.target_subcastes:
                allowed_subcastes = self._normalize_preference_list(profile.target_subcastes)
                if allowed_subcastes and not self._value_matches_exact_list(getattr(viewer_profile, 'sub_caste', ''), allowed_subcastes):
                    return False, 'target_sub_caste_mismatch'

            if profile.target_states:
                allowed_states = self._normalize_preference_list(profile.target_states)
                if allowed_states and not self._value_matches_exact_list(getattr(viewer_profile, 'state', ''), allowed_states):
                    return False, 'target_state_mismatch'

            if profile.target_cities:
                allowed_cities = self._normalize_preference_list(profile.target_cities)
                if allowed_cities and not self._value_matches_exact_list(getattr(viewer_profile, 'city', ''), allowed_cities):
                    return False, 'target_city_mismatch'

            target_gender = (profile.target_gender or '').strip()
            if target_gender and target_gender not in ('Everyone', 'All'):
                viewer_gender = getattr(viewer_profile, 'gender', '')
                if target_gender in ('Male Only', 'Groom Profiles', 'Groom') and viewer_gender != 'Groom':
                    return False, 'target_gender_mismatch'
                if target_gender in ('Female Only', 'Bride Profiles', 'Bride') and viewer_gender != 'Bride':
                    return False, 'target_gender_mismatch'

            # Age range check — only block if viewer_age is known AND out of range
            viewer_age = getattr(viewer_profile, 'age', None)
            if viewer_age is not None:
                age_min = profile.target_age_min if profile.target_age_min is not None else 0
                age_max = profile.target_age_max if profile.target_age_max is not None else 150
                if not (age_min <= viewer_age <= age_max):
                    return False, 'target_age_mismatch'

            if profile.target_marital_statuses:
                allowed_statuses = self._normalize_preference_list(profile.target_marital_statuses)
                if allowed_statuses and not self._value_matches_exact_list(getattr(viewer_profile, 'marital_status', ''), allowed_statuses):
                    return False, 'target_marital_status_mismatch'

            if profile.target_educations:
                allowed_educations = self._normalize_preference_list(profile.target_educations)
                if allowed_educations and not self._value_matches_contains_list(getattr(viewer_profile, 'education', ''), allowed_educations):
                    return False, 'target_education_mismatch'

            if profile.target_occupations:
                allowed_occupations = self._normalize_preference_list(profile.target_occupations)
                if allowed_occupations and not self._value_matches_contains_list(getattr(viewer_profile, 'profession', ''), allowed_occupations):
                    return False, 'target_occupation_mismatch'

            return True, 'visible_under_policy'

        return False, f'unsupported_visibility_type:{visibility_type}'

    def _value_matches_exact_list(self, actual, allowed_values):
        actual = (actual or '').strip().lower()
        return bool(actual and actual in allowed_values)

    def _value_matches_contains_list(self, actual, allowed_values):
        actual = (actual or '').strip().lower()
        return bool(actual and any(allowed in actual for allowed in allowed_values))

    def _profile_satisfies_partner_preference(self, profile, pref):
        if not pref:
            return True, ['no_preferences']

        gender = self._normalize_gender_preference(pref.gender)
        if gender and profile.gender != gender:
            return False, [f"gender_mismatch:{profile.gender} vs {gender}"]

        # Age checks — only fail if profile age is known
        profile_age = getattr(profile, 'age', None)
        if profile_age is not None:
            if pref.min_age is not None and profile_age < pref.min_age:
                return False, [f"age_below_min:{profile_age} < {pref.min_age}"]
            if pref.max_age is not None and profile_age > pref.max_age:
                return False, [f"age_above_max:{profile_age} > {pref.max_age}"]

        if pref.caste:
            allowed_castes = self._normalize_preference_list(pref.caste)
            if allowed_castes and 'any' not in allowed_castes and not self._value_matches_exact_list(profile.caste, allowed_castes):
                return False, [f"caste_mismatch:{profile.caste}"]

        if pref.sub_caste:
            allowed_subcastes = self._normalize_preference_list(pref.sub_caste)
            if allowed_subcastes and 'any' not in allowed_subcastes and not self._value_matches_exact_list(profile.sub_caste, allowed_subcastes):
                return False, [f"sub_caste_mismatch:{profile.sub_caste}"]

        if pref.city:
            allowed_cities = self._normalize_preference_list(pref.city)
            if allowed_cities and 'any' not in allowed_cities and not self._value_matches_exact_list(profile.city, allowed_cities):
                return False, [f"city_mismatch:{profile.city}"]
        if pref.state:
            allowed_states = self._normalize_preference_list(pref.state)
            if allowed_states and 'any' not in allowed_states and not self._value_matches_exact_list(profile.state, allowed_states):
                return False, [f"state_mismatch:{profile.state}"]
        if pref.country:
            allowed_countries = self._normalize_preference_list(pref.country)
            if allowed_countries and 'any' not in allowed_countries and not self._value_matches_exact_list(profile.country, allowed_countries):
                return False, [f"country_mismatch:{profile.country}"]

        if pref.education:
            allowed_educations = self._normalize_preference_list(pref.education)
            if allowed_educations and 'any' not in allowed_educations and not self._value_matches_contains_list(profile.education, allowed_educations):
                return False, [f"education_mismatch:{profile.education}"]
        if pref.occupation:
            allowed_occupations = self._normalize_preference_list(pref.occupation)
            if allowed_occupations and 'any' not in allowed_occupations and not self._value_matches_contains_list(profile.profession, allowed_occupations):
                return False, [f"occupation_mismatch:{profile.profession}"]
        if pref.marital_status:
            allowed_statuses = self._normalize_preference_list(pref.marital_status)
            if allowed_statuses and 'any' not in allowed_statuses and not self._value_matches_exact_list(profile.marital_status, allowed_statuses):
                return False, [f"marital_status_mismatch:{profile.marital_status}"]

        # Height check
        if getattr(pref, 'min_height', None) or getattr(pref, 'max_height', None):
            def parse_h(h_val):
                if not h_val: return None
                h_val = str(h_val).strip().lower()
                try:
                    return float(h_val)
                except ValueError:
                    pass
                import re
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
                return None
            
            p_height = parse_h(profile.height)
            if p_height is not None:
                min_h_str = getattr(pref, 'min_height', '')
                if min_h_str:
                    min_h = parse_h(min_h_str)
                    if min_h is not None and p_height < min_h:
                        return False, [f"height_below_min:{profile.height} < {pref.min_height}"]
                max_h_str = getattr(pref, 'max_height', '')
                if max_h_str:
                    max_h = parse_h(max_h_str)
                    if max_h is not None and p_height > max_h:
                        return False, [f"height_above_max:{profile.height} > {pref.max_height}"]

        if pref.income_range:
            allowed_incomes = self._normalize_preference_list(pref.income_range)
            if allowed_incomes and 'any' not in allowed_incomes:
                p_income = (profile.income or '').strip().lower()
                if not any(inc in p_income for inc in allowed_incomes):
                    return False, [f"income_range_mismatch:{profile.income}"]

        return True, ['matched_all']

    def _mutual_preference_match(self, my_profile, candidate, my_pref=None):
        candidate_pref = self._load_partner_preference(candidate, candidate.user)
        my_accepts, my_reasons = self._profile_satisfies_partner_preference(candidate, my_pref)
        candidate_accepts, candidate_reasons = self._profile_satisfies_partner_preference(my_profile, candidate_pref)

        result = {
            'my_pref_pass': my_accepts,
            'my_reasons': my_reasons,
            'candidate_pref_pass': candidate_accepts,
            'candidate_reasons': candidate_reasons,
            'candidate_pref': candidate_pref,
        }

        # Candidate must satisfy my preferences to show up.
        # If matching mode is SMART_MATCHING, candidate must also prefer the requester.
        from django.conf import settings
        matching_mode = getattr(settings, 'MATCHING_MODE', 'SMART_MATCHING')
        if matching_mode == 'SMART_MATCHING':
            if not my_accepts or not candidate_accepts:
                return False, result
        else:
            if not my_accepts:
                return False, result

        score_self = self._calculate_preference_score(candidate, my_pref)
        score_candidate = self._calculate_preference_score(my_profile, candidate_pref) if candidate_accepts else 50
        result['match_score'] = int((score_self + score_candidate) / 2)
        return True, result

    def _filter_candidates_by_preference(self, queryset, pref):
        if not pref:
            return queryset

        queryset = queryset.filter(age__gte=pref.min_age, age__lte=pref.max_age)

        gender = self._normalize_gender_preference(pref.gender)
        if gender:
            queryset = queryset.filter(gender=gender)

        if pref.caste:
            allowed_castes = self._normalize_preference_list(pref.caste)
            if allowed_castes:
                q_obj = Q()
                for caste in allowed_castes:
                    q_obj |= Q(caste__iexact=caste)
                queryset = queryset.filter(q_obj)

        if pref.sub_caste:
            allowed_subcastes = self._normalize_preference_list(pref.sub_caste)
            if allowed_subcastes:
                q_obj = Q()
                for subcaste in allowed_subcastes:
                    q_obj |= Q(sub_caste__iexact=subcaste)
                queryset = queryset.filter(q_obj)

        if pref.city:
            queryset = queryset.filter(city__iexact=pref.city.strip())
        if pref.state:
            queryset = queryset.filter(state__iexact=pref.state.strip())
        if pref.country:
            queryset = queryset.filter(country__iexact=pref.country.strip())

        if pref.education:
            educations = self._normalize_preference_list(pref.education)
            if educations:
                q_obj = Q()
                for education in educations:
                    q_obj |= Q(education__icontains=education)
                queryset = queryset.filter(q_obj)

        if pref.occupation:
            occupations = self._normalize_preference_list(pref.occupation)
            if occupations:
                q_obj = Q()
                for occupation in occupations:
                    q_obj |= Q(profession__icontains=occupation)
                queryset = queryset.filter(q_obj)

        if pref.marital_status:
            queryset = queryset.filter(marital_status__iexact=pref.marital_status.strip())
        if pref.income_range:
            queryset = queryset.filter(income__icontains=pref.income_range.strip())

        return queryset

    def _calculate_preference_score(self, profile, pref):
        if not pref:
            return 100

        score = 0
        total = 100

        if pref.min_age is not None and pref.max_age is not None:
            if pref.min_age <= profile.age <= pref.max_age:
                score += 20
        else:
            score += 20

        if pref.caste:
            allowed_castes = self._normalize_preference_list(pref.caste)
            if allowed_castes and profile.caste and profile.caste.strip().lower() in allowed_castes:
                score += 15
        else:
            score += 15

        if pref.sub_caste:
            allowed_subcastes = self._normalize_preference_list(pref.sub_caste)
            if allowed_subcastes and profile.sub_caste and profile.sub_caste.strip().lower() in allowed_subcastes:
                score += 15
        else:
            score += 15

        if pref.city or pref.state or pref.country:
            if pref.city and profile.city and profile.city.strip().lower() == pref.city.strip().lower():
                score += 15
            elif pref.state and profile.state and profile.state.strip().lower() == pref.state.strip().lower():
                score += 15
            elif pref.country and profile.country and profile.country.strip().lower() == pref.country.strip().lower():
                score += 15
        else:
            score += 15

        if pref.education:
            if pref.education.strip().lower() in (profile.education or '').strip().lower():
                score += 10
        else:
            score += 10

        if pref.occupation:
            if pref.occupation.strip().lower() in (profile.profession or '').strip().lower():
                score += 10
        else:
            score += 10

        if pref.marital_status:
            if profile.marital_status and profile.marital_status.strip().lower() == pref.marital_status.strip().lower():
                score += 15
        else:
            score += 15

        return min(int((score / total) * 100), 100)

    def destroy(self, request, *args, **kwargs):
        profile = self.get_object()
        is_owner = (profile.user == request.user)
        is_admin = False
        try:
            is_admin = request.user.is_superuser or request.user.member_profile.role in ('community_admin', 'super_admin')
        except Exception:
            pass
            
        if not (is_owner or is_admin):
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        from django.utils import timezone
        profile.deleted_at = timezone.now()
        profile.status = 'Deleted'
        profile.save()
        
        # Log Audit
        MatrimonyAuditLog.objects.create(
            profile=profile,
            action="Soft Delete Profile",
            performed_by=request.user,
            details=f"Soft deleted matrimony profile"
        )
        return Response({"status": "success", "detail": "Profile soft deleted successfully."})

    def _active_approved_profiles(self):
        """
        Returns base queryset of all active/approved matrimony profiles
        that are eligible to appear in reach estimates.
        Excludes Draft, Suspended, and Rejected profiles.
        """
        from django.db.models import Q
        return MatrimonyProfile.objects.filter(
            status__in=["Approved", "Active", "Featured"]
        ).select_related('user', 'community')

    @action(detail=False, methods=['post'], url_path='estimate-reach')
    def estimate_reach(self, request):
        """
        Estimates how many active profiles would see a matrimony profile
        based on the given visibility scope and targeting filters.
        Returns: { eligible_users, eligible_communities, eligible_matches }
        """
        try:
            data = request.data

            # Base queryset — only active approved profiles
            queryset = MatrimonyProfile.objects.filter(
                status__in=["Approved", "Active", "Featured"]
            )
            if request.user and request.user.is_authenticated:
                queryset = queryset.exclude(user=request.user)  # Exclude self

            visibility_scope = data.get('visibility_scope', 'Platform Wide')
            visibility_hierarchy = data.get('visibility_hierarchy', 'My Community')
            selected_communities = data.get('selected_communities', [])
            filter_communities = data.get('filter_communities', [])

            # ── Scope-based filtering ──────────────────────────────
            if visibility_scope == "Private":
                # Private profiles have 0 reach by design
                return Response({
                    'eligible_users': 0,
                    'eligible_communities': 0,
                    'eligible_matches': 0,
                })

            elif visibility_scope == "Community Network":
                # Determine target community (fallback to request.user's community if not passed)
                profile_community_id = data.get('profile_community_id')
                user_community = None
                if profile_community_id:
                    try:
                        user_community = Community.objects.get(id=int(profile_community_id))
                    except (Community.DoesNotExist, ValueError, TypeError):
                        pass

                if not user_community:
                    user_member = getattr(request.user, 'member_profile', None) if request.user and request.user.is_authenticated else None
                    user_community = getattr(user_member, 'community', None) if user_member else None

                if not user_community:
                    # If no community can be determined, community network visibility has no reach
                    queryset = queryset.none()
                else:
                    allowed_ids = {user_community.id}
                    if visibility_hierarchy == "Selected Communities" and selected_communities:
                        allowed_ids = set(int(cid) for cid in selected_communities if str(cid).isdigit())
                    elif visibility_hierarchy == "My Community":
                        pass  # allowed_ids = {user_community.id}
                    elif visibility_hierarchy == "Parent Community":
                        if user_community.parent_id:
                            allowed_ids.add(user_community.parent_id)
                    elif visibility_hierarchy == "Child Communities":
                        allowed_ids.update(c.id for c in get_descendants_for_community(user_community))
                    elif visibility_hierarchy in ("Entire Hierarchy Chain", "Entire Network"):
                        allowed_ids.update(c.id for c in get_ancestors_for_community(user_community))
                        allowed_ids.update(c.id for c in get_descendants_for_community(user_community))
                    
                    queryset = queryset.filter(community_id__in=allowed_ids)

            elif visibility_scope in ["Custom Audience", "Platform Wide"]:
                # Apply filter_communities if specified
                if filter_communities:
                    queryset = queryset.filter(community_id__in=filter_communities)

            # ── Audience targeting filters ─────────────────────────
            filter_gender = data.get('filter_gender', 'Everyone')
            if filter_gender == 'Male Only':
                queryset = queryset.filter(gender='Groom')
            elif filter_gender == 'Female Only':
                queryset = queryset.filter(gender='Bride')

            filter_min_age = data.get('filter_min_age', 18)
            filter_max_age = data.get('filter_max_age', 60)
            if filter_min_age:
                queryset = queryset.filter(age__gte=filter_min_age)
            if filter_max_age:
                queryset = queryset.filter(age__lte=filter_max_age)

            filter_castes = data.get('filter_castes', '')
            if filter_castes:
                caste_list = [c.strip() for c in filter_castes.split(',') if c.strip()]
                if caste_list:
                    queryset = queryset.filter(caste__in=caste_list)

            filter_states = data.get('filter_states', '')
            if filter_states:
                state_list = [s.strip() for s in filter_states.split(',') if s.strip()]
                if state_list:
                    queryset = queryset.filter(state__in=state_list)

            filter_cities = data.get('filter_cities', '')
            if filter_cities:
                city_list = [c.strip() for c in filter_cities.split(',') if c.strip()]
                if city_list:
                    queryset = queryset.filter(city__in=city_list)

            filter_marital_statuses = data.get('filter_marital_statuses', '')
            if filter_marital_statuses:
                status_list = [s.strip() for s in filter_marital_statuses.split(',') if s.strip()]
                if status_list:
                    queryset = queryset.filter(marital_status__in=status_list)

            filter_educations = data.get('filter_educations', '')
            if filter_educations:
                edu_list = [e.strip().lower() for e in filter_educations.split(',') if e.strip()]
                if edu_list:
                    q_obj = Q()
                    for edu in edu_list:
                        q_obj |= Q(education__icontains=edu)
                    queryset = queryset.filter(q_obj)

            filter_occupations = data.get('filter_occupations', '')
            if filter_occupations:
                occ_list = [o.strip().lower() for o in filter_occupations.split(',') if o.strip()]
                if occ_list:
                    q_obj = Q()
                    for occ in occ_list:
                        q_obj |= Q(profession__icontains=occ)
                    queryset = queryset.filter(q_obj)

            # ── Count results ──────────────────────────────────────
            eligible_users = queryset.count()

            # Count distinct communities represented
            eligible_communities = queryset.values('community_id').distinct().count()

            # Rough match estimate: profiles that could be mutual matches
            # (opposite gender as a basic signal)
            profile_gender = data.get('profile_gender')
            if not profile_gender:
                user_member = getattr(request.user, 'member_profile', None) if request.user and request.user.is_authenticated else None
                profile_gender = getattr(user_member, 'gender', None) if user_member else None
                # Normalize 'Male'/'Female' to 'Groom'/'Bride'
                if profile_gender == 'Male':
                    profile_gender = 'Groom'
                elif profile_gender == 'Female':
                    profile_gender = 'Bride'

            if profile_gender in ['Groom', 'Male']:
                match_queryset = queryset.filter(gender='Bride')
            elif profile_gender in ['Bride', 'Female']:
                match_queryset = queryset.filter(gender='Groom')
            else:
                match_queryset = queryset
            eligible_matches = match_queryset.count()

            return Response({
                'eligible_users': eligible_users,
                'eligible_communities': eligible_communities,
                'eligible_matches': eligible_matches,
            })

        except Exception as e:
            import traceback
            print(f"[estimate_reach] Error: {e}")
            traceback.print_exc()
            return Response({
                'eligible_users': 0,
                'eligible_communities': 0,
                'eligible_matches': 0,
                'error': str(e)
            }, status=200)  # Return 200 with 0s instead of 500 so frontend handles gracefully

    @action(detail=False, methods=['get'], url_path='my-profiles')
    def my_profiles(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        profiles = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True)
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data)
    @action(detail=False, methods=['get', 'post'], url_path='audit-sync')
    def audit_sync(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        member = getattr(request.user, 'member_profile', None)
        profile = MatrimonyProfile.objects.filter(user=request.user, family_member__isnull=True, deleted_at__isnull=True).first()
        
        if not member:
            return Response({"detail": "Member profile not found"}, status=status.HTTP_404_NOT_FOUND)
        if not profile:
            return Response({"detail": "Matrimony profile not found"}, status=status.HTTP_404_NOT_FOUND)

        fields_to_compare = [
            ("Full Name", lambda m: m.name, lambda p: p.name, lambda mv, pv: mv == pv),
            ("Gender", lambda m: 'Groom' if m.gender == 'Male' else 'Bride' if m.gender == 'Female' else 'Other', lambda p: p.gender, lambda mv, pv: mv == pv),
            ("Date Of Birth", lambda m: str(m.birthdate) if m.birthdate else None, lambda p: str(p.dob) if p.dob else None, lambda mv, pv: mv == pv),
            ("Age", lambda m: m.age, lambda p: p.age, lambda mv, pv: mv == pv),
            ("Community", lambda m: m.community.name if m.community else None, lambda p: p.community.name if p.community else None, lambda mv, pv: mv == pv),
            ("Caste", lambda m: m.community.caste if m.community else '', lambda p: p.caste or '', lambda mv, pv: mv == pv),
            ("Sub Caste", lambda m: m.community.sub_caste if m.community else '', lambda p: p.sub_caste or '', lambda mv, pv: mv == pv),
            ("State", lambda m: m.state, lambda p: p.state, lambda mv, pv: mv == pv),
            ("City", lambda m: m.village, lambda p: p.city, lambda mv, pv: mv == pv),
            ("Mobile Number", lambda m: m.phone, lambda p: p.contact_phone, lambda mv, pv: mv == pv),
            ("Email", lambda m: m.email, lambda p: p.contact_email, lambda mv, pv: mv == pv)
        ]
        
        comparison_results = []
        conflicts_count = 0
        
        for label, m_func, p_func, comp_func in fields_to_compare:
            try:
                mv = m_func(member)
            except Exception:
                mv = None
            try:
                pv = p_func(profile)
            except Exception:
                pv = None
                
            in_sync = comp_func(mv, pv)
            if not in_sync:
                conflicts_count += 1
                
            comparison_results.append({
                "field": label,
                "member_value": mv,
                "matrimony_value": pv,
                "in_sync": in_sync
            })
            
        if request.method == 'POST':
            profile.name = member.name
            if member.gender == 'Male':
                profile.gender = 'Groom'
            elif member.gender == 'Female':
                profile.gender = 'Bride'
            profile.dob = member.birthdate
            profile.age = member.age
            profile.community = member.community
            profile.state = member.state
            profile.city = member.village
            profile.contact_phone = member.phone
            profile.contact_email = member.email
            profile.contact_name = member.name
            
            if member.community:
                profile.caste = member.community.caste or ''
                profile.sub_caste = member.community.sub_caste or ''
                
            if member.avatar:
                profile.photo = member.avatar
            if member.avatar_url:
                profile.photo_url = member.avatar_url
                
            profile.save()
            profile.recalculate_status(save=True)
            
            comparison_results = []
            for label, m_func, p_func, comp_func in fields_to_compare:
                try:
                    mv = m_func(member)
                except Exception:
                    mv = None
                try:
                    pv = p_func(profile)
                except Exception:
                    pv = None
                in_sync = comp_func(mv, pv)
                comparison_results.append({
                    "field": label,
                    "member_value": mv,
                    "matrimony_value": pv,
                    "in_sync": in_sync
                })
            conflicts_count = 0
            
            return Response({
                "detail": "Synchronization completed successfully.",
                "conflicts_count": conflicts_count,
                "fields": comparison_results
            })
            
        return Response({
            "conflicts_count": conflicts_count,
            "fields": comparison_results
        })

    @action(detail=False, methods=['get', 'post', 'patch'], url_path='my-profile')
    def my_profile(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        def to_bool(val, default=True):
            if val is None:
                return default
            if isinstance(val, bool):
                return val
            return str(val).lower() == 'true'

        def get_int_list(data, key):
            val = None
            if hasattr(data, 'getlist'):
                val = data.getlist(key)
            if not val:
                val = data.get(key)
            if not val:
                return []
            if isinstance(val, list):
                res = []
                for x in val:
                    try:
                        res.append(int(x))
                    except Exception:
                        pass
                return res
            if isinstance(val, str):
                import json
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return [int(x) for x in parsed if str(x).strip()]
                except Exception:
                    pass
                try:
                    return [int(x.strip()) for x in val.split(',') if x.strip()]
                except Exception:
                    pass
            return []

        def parse_string_list(data, *keys):
            val = None
            for key in keys:
                if hasattr(data, 'getlist'):
                    candidate = data.getlist(key)
                    if candidate:
                        val = candidate
                        break
                candidate = data.get(key)
                if candidate:
                    val = candidate
                    break
            if not val:
                return ''
            if isinstance(val, list):
                return ','.join(str(x).strip() for x in val if str(x).strip())
            if isinstance(val, str):
                import json
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return ','.join(str(x).strip() for x in parsed if str(x).strip())
                except Exception:
                    pass
                return ','.join(str(x).strip() for x in val.split(',') if x.strip())
            return str(val).strip()

        def normalize_visibility_type(value):
            if not value:
                return 'COMMUNITY_NETWORK'
            value = str(value).strip()
            mapping = {
                'Private': 'PRIVATE',
                'PRIVATE': 'PRIVATE',
                'Community Network': 'COMMUNITY_NETWORK',
                'My Community Only': 'COMMUNITY_NETWORK',
                'Parent Community': 'COMMUNITY_NETWORK',
                'Child Communities': 'COMMUNITY_NETWORK',
                'Entire Network': 'COMMUNITY_NETWORK',
                'Selected Communities': 'COMMUNITY_NETWORK',
                'Platform Wide': 'PLATFORM_WIDE',
                'Public': 'PLATFORM_WIDE',
                'PLATFORM_WIDE': 'PLATFORM_WIDE',
                'Custom Audience': 'CUSTOM_AUDIENCE',
                'CUSTOM_AUDIENCE': 'CUSTOM_AUDIENCE',
                'COMMUNITY ONLY': 'COMMUNITY_NETWORK',
                'TARGETED MATCHES': 'CUSTOM_AUDIENCE',
                'OPEN TO ALL': 'PLATFORM_WIDE',
                'COMMUNITY_NETWORK': 'COMMUNITY_NETWORK',
            }
            return mapping.get(value, 'COMMUNITY_NETWORK')

        if request.method == 'GET':
            profile_id = request.query_params.get('profile_id')
            if profile_id:
                profile = MatrimonyProfile.objects.filter(user=request.user, id=profile_id, deleted_at__isnull=True).first()
            else:
                profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()

            if not profile:
                return Response({"detail": "No matrimony profile found"}, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(profile)
            return Response(serializer.data)

        elif request.method == 'POST':
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            relationship = data.get('relationship', 'Family Member')
            family_member_id = data.get('family_member') or data.get('member_id')

            try:
                user_member = request.user.member_profile
            except Exception:
                return Response({"detail": "Member profile is not configured for your account."}, status=status.HTTP_400_BAD_REQUEST)

            caste_val = user_member.community.caste if user_member.community and user_member.community.caste else ''
            sub_caste_val = user_member.community.sub_caste if user_member.community and user_member.community.sub_caste else ''
            city_val = user_member.community.village if user_member.community else ''
            state_val = user_member.community.state if user_member.community else ''

            community = user_member.community or Community.objects.filter(deleted_at__isnull=True).first()
            if not community:
                return Response({"detail": "Unable to resolve community for your account."}, status=status.HTTP_400_BAD_REQUEST)

            is_self = str(relationship).lower() == 'self' or not family_member_id or str(family_member_id).lower() == 'self'

            if is_self:
                if MatrimonyProfile.objects.filter(user=request.user, family_member__isnull=True, deleted_at__isnull=True).exists():
                    return Response({"detail": "A matrimony profile already exists for yourself."}, status=status.HTTP_400_BAD_REQUEST)
                f_member = None
                name = user_member.name
                dob = data.get('dob') or (user_member.birthdate.strftime('%Y-%m-%d') if user_member.birthdate else None)
                gender = data.get('gender')
                if not gender:
                    gender = 'Groom' if user_member.gender == 'Male' else 'Bride'
                education = data.get('education') or user_member.education or ''
                profession = data.get('profession') or user_member.profession or ''
                caste = data.get('caste') or caste_val
                sub_caste = data.get('sub_caste') or sub_caste_val
                city = data.get('city') or user_member.village or city_val
                state = data.get('state') or user_member.state or state_val
            else:
                try:
                    f_member = FamilyMember.objects.get(id=family_member_id)
                except FamilyMember.DoesNotExist:
                    return Response({"detail": "Family member not found"}, status=status.HTTP_404_NOT_FOUND)

                if user_member.role in ('community_admin', 'super_admin'):
                    has_permission = Family.objects.filter(id=f_member.family_id, community=user_member.community).exists()
                else:
                    has_permission = Family.objects.filter(id=f_member.family_id, member=user_member).exists()
                if not has_permission:
                    return Response({"detail": "You do not have permission to link this family member."}, status=status.HTTP_403_FORBIDDEN)

                if MatrimonyProfile.objects.filter(family_member=f_member, deleted_at__isnull=True).exists():
                    return Response({"detail": "A matrimony profile already exists for this family member."}, status=status.HTTP_400_BAD_REQUEST)

                name = f_member.name
                dob = data.get('dob') or (f_member.birthdate.strftime('%Y-%m-%d') if f_member.birthdate else None)
                gender = data.get('gender')
                if not gender:
                    if f_member.relation in ['Son', 'Father', 'Brother', 'Husband']:
                        gender = 'Groom'
                    else:
                        gender = 'Bride'
                education = data.get('education') or f_member.education or ''
                profession = data.get('profession') or f_member.occupation or ''
                caste = data.get('caste') or caste_val
                sub_caste = data.get('sub_caste') or sub_caste_val
                city = data.get('city') or city_val
                state = data.get('state') or state_val

            age = 25
            if dob:
                try:
                    from datetime import datetime
                    birth_date = datetime.strptime(dob, '%Y-%m-%d')
                    today = datetime.today()
                    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                except Exception:
                    pass

            photo_file = request.FILES.get('photo') or request.FILES.get('image')
            visibility_type = normalize_visibility_type(data.get('visibility_scope') or data.get('visibility_type'))
            hierarchy_scope = data.get('visibility_hierarchy') or data.get('hierarchy_scope') or 'My Community'
            target_communities = get_int_list(data, 'target_communities') or get_int_list(data, 'filter_communities')
            selected_comms = get_int_list(data, 'selected_communities')
            target_castes = parse_string_list(data, 'target_castes', 'filter_castes')
            target_subcastes = parse_string_list(data, 'target_subcastes', 'filter_sub_castes')
            target_states = parse_string_list(data, 'target_states', 'filter_states')
            target_cities = parse_string_list(data, 'target_cities', 'filter_cities')
            target_gender = data.get('target_gender') or data.get('filter_gender') or 'Everyone'
            target_age_min = int(data.get('target_age_min') or data.get('filter_min_age') or 18)
            target_age_max = int(data.get('target_age_max') or data.get('filter_max_age') or 60)
            target_marital_statuses = parse_string_list(data, 'target_marital_statuses', 'filter_marital_statuses')
            target_educations = parse_string_list(data, 'target_educations', 'filter_educations')
            target_occupations = parse_string_list(data, 'target_occupations', 'filter_occupations')

            profile = MatrimonyProfile.objects.create(
                user=request.user,
                family_member=f_member,
                community=community,
                name=name,
                gender=gender,
                dob=dob,
                age=age,
                education=education,
                profession=profession,
                caste=caste,
                sub_caste=sub_caste,
                city=city,
                state=state,
                country=data.get('country', 'India'),
                marital_status=data.get('marital_status', 'Never Married'),
                divorce_year=data.get('divorce_year') or None,
                has_children=to_bool(data.get('has_children'), False),
                children_count=data.get('children_count') or None,
                children_living_with=data.get('children_living_with', ''),
                year_of_loss=data.get('year_of_loss') or None,
                widowed_children_info=data.get('widowed_children_info', ''),
                height=data.get('height', ''),
                weight=data.get('weight', ''),
                complexion=data.get('complexion', ''),
                income=data.get('income', ''),
                religion=data.get('religion', 'Hindu'),
                mother_tongue=data.get('mother_tongue', ''),
                languages_known=data.get('languages_known', ''),
                current_address=data.get('current_address', ''),
                native_place=data.get('native_place', ''),
                diet=data.get('diet', 'Vegetarian'),
                smoking=data.get('smoking', 'No'),
                drinking=data.get('drinking', 'No'),
                about=data.get('about', ''),
                aadhaar=data.get('aadhaar', ''),
                pan=data.get('pan', ''),
                passport=data.get('passport', ''),
                driving_license=data.get('driving_license', ''),
                visibility_type=visibility_type,
                hierarchy_scope=hierarchy_scope,
                contact_permission=data.get('contact_permission', 'Everyone Who Can View'),
                allow_interests=to_bool(data.get('allow_interests'), True),
                allow_direct_chat=to_bool(data.get('allow_direct_chat'), True),
                allow_phone=to_bool(data.get('allow_phone'), True),
                allow_whatsapp=to_bool(data.get('allow_whatsapp'), True),
                allow_email=to_bool(data.get('allow_email'), True),
                target_castes=target_castes,
                target_subcastes=target_subcastes,
                target_states=target_states,
                target_cities=target_cities,
                target_gender=target_gender,
                target_age_min=target_age_min,
                target_age_max=target_age_max,
                target_marital_statuses=target_marital_statuses,
                target_educations=target_educations,
                target_occupations=target_occupations,
                contact_name=data.get('contact_name', name),
                contact_relation=data.get('contact_relation', 'Self'),
                contact_phone=data.get('contact_phone', ''),
                contact_whatsapp=data.get('contact_whatsapp', ''),
                contact_email=data.get('contact_email', ''),
                photo=photo_file,
                status='Active' if self._open_testing_enabled() else 'Draft',
                is_verified=self._open_testing_enabled(),
            )

            if selected_comms:
                profile.selected_communities.set(selected_comms)
            if target_communities:
                profile.target_communities.set(target_communities)

            if photo_file:
                MatrimonyPhoto.objects.create(
                    profile=profile,
                    image=photo_file,
                    category='Profile Photo',
                    is_private=False,
                    order=0
                )

            MatrimonyAuditLog.objects.create(
                profile=profile,
                action="Create Profile",
                performed_by=request.user,
                details=f"Created matrimony profile for: {name}"
            )

            if self._open_testing_enabled():
                MatrimonyProfile.objects.filter(pk=profile.pk).update(status='Active', is_verified=True)
                profile.refresh_from_db()
            else:
                profile.recalculate_status()
            serializer = self.get_serializer(profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        elif request.method in ('PATCH', 'PUT'):
            payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            profile_id = payload.get('id') or request.query_params.get('profile_id')
            if profile_id:
                profile = MatrimonyProfile.objects.filter(user=request.user, id=profile_id, deleted_at__isnull=True).first()
            else:
                profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()

            if not profile:
                return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

            if 'visibility_scope' in payload:
                payload['visibility_type'] = normalize_visibility_type(payload.get('visibility_scope'))
            if 'visibility_hierarchy' in payload:
                payload['hierarchy_scope'] = payload.get('visibility_hierarchy')

            # Accept legacy filter field names and map them to the current target_* model fields
            if 'filter_communities' in payload:
                payload['target_communities'] = payload.get('filter_communities')
            if 'filter_castes' in payload:
                payload['target_castes'] = payload.get('filter_castes')
            if 'filter_sub_castes' in payload:
                payload['target_subcastes'] = payload.get('filter_sub_castes')
            if 'filter_states' in payload:
                payload['target_states'] = payload.get('filter_states')
            if 'filter_cities' in payload:
                payload['target_cities'] = payload.get('filter_cities')
            if 'filter_gender' in payload:
                payload['target_gender'] = payload.get('filter_gender')
            if 'filter_min_age' in payload:
                payload['target_age_min'] = payload.get('filter_min_age')
            if 'filter_max_age' in payload:
                payload['target_age_max'] = payload.get('filter_max_age')
            if 'filter_marital_statuses' in payload:
                payload['target_marital_statuses'] = payload.get('filter_marital_statuses')
            if 'filter_educations' in payload:
                payload['target_educations'] = payload.get('filter_educations')
            if 'filter_occupations' in payload:
                payload['target_occupations'] = payload.get('filter_occupations')

            serializer = self.get_serializer(profile, data=payload, partial=True)
            if serializer.is_valid():
                profile = serializer.save()

                if 'selected_communities' in payload:
                    profile.selected_communities.set(get_int_list(payload, 'selected_communities'))

                if 'target_communities' in payload or 'filter_communities' in payload:
                    target_comms = get_int_list(payload, 'target_communities') or get_int_list(payload, 'filter_communities')
                    profile.target_communities.set(target_comms)

                if 'visibility_type' in payload and payload.get('visibility_type') == 'COMMUNITY_NETWORK' and 'selected_communities' in payload:
                    profile.selected_communities.set(get_int_list(payload, 'selected_communities'))

                if 'dob' in payload:
                    dob = payload.get('dob')
                    if dob:
                        try:
                            from datetime import datetime
                            birth_date = datetime.strptime(dob, '%Y-%m-%d')
                            today = datetime.today()
                            profile.age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                            profile.save()
                        except Exception:
                            pass

                MatrimonyAuditLog.objects.create(
                    profile=profile,
                    action="Update Profile",
                    performed_by=request.user,
                    details=f"Updated profile fields: {', '.join(payload.keys())}"
                )
                profile.refresh_from_db()
                if self._open_testing_enabled():
                    MatrimonyProfile.objects.filter(pk=profile.pk).update(status='Active', is_verified=True)
                else:
                    # If member edits a Rejected profile, clear verification so it re-enters the approval queue
                    if profile.status == 'Rejected':
                        MatrimonyProfile.objects.filter(pk=profile.pk).update(is_verified=False)
                        profile.is_verified = False
                    profile.recalculate_status(save=True)
                profile.refresh_from_db()
                fresh_serializer = self.get_serializer(profile)
                return Response(fresh_serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='family-members')
    def family_members(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            user_member = request.user.member_profile
            if user_member.role in ('community_admin', 'super_admin'):
                families = Family.objects.filter(community=user_member.community)
            else:
                families = Family.objects.filter(member=user_member)
            members = FamilyMember.objects.filter(family__in=families)
            # Exclude members that already have an active profile
            existing_profile_member_ids = MatrimonyProfile.objects.filter(deleted_at__isnull=True).values_list('family_member_id', flat=True)
            available_members = members.exclude(id__in=existing_profile_member_ids)
            
            serializer = FamilyMemberSerializer(available_members, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'post', 'patch'], url_path='preferences')
    def preferences(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile_id = request.query_params.get('profile_id')
        if profile_id:
            profile = MatrimonyProfile.objects.filter(user=request.user, id=profile_id, deleted_at__isnull=True).first()
        else:
            profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
            
        if not profile:
            # Fallback to user-level preference mapping (legacy compat)
            if request.method == 'GET':
                pref, created = PartnerPreference.objects.get_or_create(user=request.user)
                return Response(PartnerPreferenceSerializer(pref).data)
            elif request.method in ('POST', 'PATCH'):
                pref, created = PartnerPreference.objects.get_or_create(user=request.user)
                # If preference_data is sent in payload
                pref_data = request.data.get('preferences_data')
                if pref_data is not None:
                    from api.preference_engine import PreferenceEngine
                    try:
                        PreferenceEngine.validate_preferences(pref_data)
                    except ValidationError as e:
                        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
                serializer = PartnerPreferenceSerializer(pref, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if request.method == 'GET':
            from api.preference_engine import PreferenceEngine
            # Make sure preference_data is initialized
            pref_data = PreferenceEngine.load_preferences(profile.id)
            pref = PartnerPreference.objects.get(profile=profile)
            serializer = PartnerPreferenceSerializer(pref)
            return Response(serializer.data)
            
        elif request.method in ('POST', 'PATCH'):
            pref_data = request.data.get('preferences_data')
            if pref_data is not None:
                from api.preference_engine import PreferenceEngine
                try:
                    PreferenceEngine.save_preferences(profile.id, pref_data)
                except ValidationError as e:
                    return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            pref = PartnerPreference.objects.get(profile=profile)
            serializer = PartnerPreferenceSerializer(pref, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                profile.recalculate_status()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='preferences/validate')
    def validate_preferences(self, request):
        from api.preference_engine import PreferenceEngine
        from rest_framework.exceptions import ValidationError
        try:
            PreferenceEngine.validate_preferences(request.data)
            return Response({"valid": True})
        except ValidationError as e:
            return Response({"valid": False, "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'], url_path='compatibility')
    def compatibility(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        candidate = self.get_object()
        viewer_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
        if not viewer_profile:
            return Response({"detail": "You must have a matrimony profile to check compatibility"}, status=status.HTTP_400_BAD_REQUEST)
            
        from api.preference_engine import PreferenceEngine
        comp = PreferenceEngine.explain_compatibility(viewer_profile, candidate)
        return Response(comp)

    @action(detail=False, methods=['post'], url_path='compare-profiles')
    def compare_profiles(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile_a_id = request.data.get('profile_a')
        profile_b_id = request.data.get('profile_b')
        if not profile_a_id or not profile_b_id:
            return Response({"detail": "profile_a and profile_b are required fields"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            profile_a = MatrimonyProfile.objects.get(id=profile_a_id, deleted_at__isnull=True)
            profile_b = MatrimonyProfile.objects.get(id=profile_b_id, deleted_at__isnull=True)
        except MatrimonyProfile.DoesNotExist:
            return Response({"detail": "One or both profiles do not exist"}, status=status.HTTP_404_NOT_FOUND)
            
        from api.preference_engine import PreferenceEngine
        res = PreferenceEngine.compare_profiles(profile_a, profile_b)
        return Response(res)

    @action(detail=False, methods=['get', 'post', 'patch'], url_path='visibility')
    def visibility(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        if request.method == 'GET':
            vis, created = ProfileVisibility.objects.get_or_create(user=request.user)
            serializer = ProfileVisibilitySerializer(vis)
            return Response(serializer.data)
            
        elif request.method in ('POST', 'PATCH'):
            vis, created = ProfileVisibility.objects.get_or_create(user=request.user)
            serializer = ProfileVisibilitySerializer(vis, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        profile = MatrimonyProfile.objects.filter(id=pk, deleted_at__isnull=True).first()
        if not profile:
            return Response({"error": "Matrimony profile not found"}, status=404)
        if profile.user != request.user and not request.user.is_superuser:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        image = request.FILES.get('image')
        category = request.data.get('category', 'Profile Photo')
        # If first photo, default it to Profile Photo category
        if profile.photos.count() == 0:
            category = 'Profile Photo'
            
        is_private = request.data.get('is_private', 'false').lower() == 'true'
        
        if not image:
            return Response({"detail": "No image file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        if category == 'Profile Photo':
            profile.photos.filter(category='Profile Photo').update(category='Lifestyle Photo')
            
        photo = MatrimonyPhoto.objects.create(
            profile=profile,
            image=image,
            category=category,
            is_private=is_private,
            order=profile.photos.count()
        )
        
        if category == 'Profile Photo':
            profile.photo = image
            profile.save()
        
        MatrimonyAuditLog.objects.create(
            profile=profile,
            action="Upload Photo",
            performed_by=request.user,
            details=f"Uploaded photo in category: {category}"
        )
        profile.recalculate_status()
        return Response(MatrimonyPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='delete-photo')
    def delete_photo(self, request, pk=None):
        profile = MatrimonyProfile.objects.filter(id=pk, deleted_at__isnull=True).first()
        if not profile:
            return Response({"error": "Matrimony profile not found"}, status=404)
        
        try:
            is_admin = request.user.is_superuser or (
                request.user.member_profile.role in ('community_admin', 'super_admin') and 
                request.user.member_profile.community_id == profile.community_id
            )
        except Exception:
            is_admin = False

        if profile.user != request.user and not is_admin:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        photo_id = request.data.get('photo_id')
        if not photo_id:
            return Response({"detail": "photo_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            photo = MatrimonyPhoto.objects.get(id=photo_id, profile=profile)
            is_profile_photo = (photo.category == 'Profile Photo')
            photo.delete()
            
            if is_profile_photo:
                next_photo = profile.photos.first()
                if next_photo:
                    next_photo.category = 'Profile Photo'
                    next_photo.save()
                    profile.photo = next_photo.image
                else:
                    profile.photo = None
                profile.save()
            
            MatrimonyAuditLog.objects.create(
                profile=profile,
                action="Delete Photo",

                performed_by=request.user,
                details=f"Deleted photo ID: {photo_id}"
            )
            profile.recalculate_status()
            return Response({"status": "success"})
        except MatrimonyPhoto.DoesNotExist:
            return Response({"detail": "Photo not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='set-primary-photo')
    def set_primary_photo(self, request, pk=None):
        profile = MatrimonyProfile.objects.filter(id=pk, deleted_at__isnull=True).first()
        if not profile:
            return Response({"error": "Matrimony profile not found"}, status=404)
        
        try:
            is_admin = request.user.is_superuser or (
                request.user.member_profile.role in ('community_admin', 'super_admin') and 
                request.user.member_profile.community_id == profile.community_id
            )
        except Exception:
            is_admin = False

        if profile.user != request.user and not is_admin:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        photo_id = request.data.get('photo_id')
        if not photo_id:
            return Response({"detail": "photo_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            photo = MatrimonyPhoto.objects.get(id=photo_id, profile=profile)
            # Demote all current profile photos to Lifestyle Photo
            profile.photos.filter(category='Profile Photo').update(category='Lifestyle Photo')
            # Set this one to Profile Photo
            photo.category = 'Profile Photo'
            photo.save()
            
            # Update main profile photo field
            profile.photo = photo.image
            profile.save()
            
            # Recalculate status
            profile.recalculate_status()
            
            MatrimonyAuditLog.objects.create(
                profile=profile,
                action="Set Primary Photo",
                performed_by=request.user,
                details=f"Set photo ID: {photo_id} as primary"
            )
            return Response({"status": "success", "detail": "Primary photo updated successfully."})
        except MatrimonyPhoto.DoesNotExist:
            return Response({"detail": "Photo not found"}, status=status.HTTP_404_NOT_FOUND)
        except MatrimonyPhoto.DoesNotExist:
            return Response({"detail": "Photo not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='reorder-photos')
    def reorder_photos(self, request, pk=None):
        profile = self.get_object()
        if profile.user != request.user and not request.user.is_superuser:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        photo_ids = request.data.get('photo_ids', [])
        for index, photo_id in enumerate(photo_ids):
            profile.photos.filter(id=photo_id).update(order=index)
            
        MatrimonyAuditLog.objects.create(
            profile=profile,
            action="Reorder Photos",
            performed_by=request.user,
            details=f"Reordered photos to order: {photo_ids}"
        )
        return Response({"status": "success"})

    @action(detail=True, methods=['post'], url_path='update-photo')
    def update_photo(self, request, pk=None):
        profile = MatrimonyProfile.objects.filter(id=pk, deleted_at__isnull=True).first()
        if not profile:
            return Response({"error": "Matrimony profile not found"}, status=404)
        if profile.user != request.user and not request.user.is_superuser:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        photo_id = request.data.get('photo_id')
        if not photo_id:
            return Response({"detail": "photo_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            photo = MatrimonyPhoto.objects.get(id=photo_id, profile=profile)
            
            category = request.data.get('category')
            is_private = request.data.get('is_private')
            
            if category is not None:
                if category == 'Profile Photo':
                    profile.photos.filter(category='Profile Photo').update(category='Lifestyle Photo')
                    profile.photo = photo.image
                    profile.save()
                photo.category = category
                
            if is_private is not None:
                def to_bool(val, default=False):
                    if val is None:
                        return default
                    if isinstance(val, bool):
                        return val
                    return str(val).lower() == 'true'
                photo.is_private = to_bool(is_private, False)
                
            photo.save()
            
            MatrimonyAuditLog.objects.create(
                profile=profile,
                action="Update Photo",
                performed_by=request.user,
                details=f"Updated photo ID: {photo_id} (category: {category}, is_private: {is_private})"
            )
            return Response({"status": "success", "photo": MatrimonyPhotoSerializer(photo).data})
        except MatrimonyPhoto.DoesNotExist:
            return Response({"detail": "Photo not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify_profile(self, request, pk=None):
        profile = self.get_object()
        try:
            is_admin = request.user.is_superuser or request.user.member_profile.role in ('community_admin', 'super_admin')
        except Exception:
            is_admin = False
            
        if not is_admin:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        profile.is_verified = True
        profile.status = 'Approved'
        profile.save()
        
        MatrimonyAuditLog.objects.create(
            profile=profile,
            action="Verify Profile",
            performed_by=request.user,
            details="Verified profile credentials"
        )
        return Response({"status": "success", "detail": "Profile approved successfully."})

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend_profile(self, request, pk=None):
        profile = self.get_object()
        try:
            is_admin = request.user.is_superuser or request.user.member_profile.role in ('community_admin', 'super_admin')
        except Exception:
            is_admin = False
            
        if not is_admin:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        profile.status = 'Suspended'
        profile.save()
        
        MatrimonyAuditLog.objects.create(
            profile=profile,
            action="Suspend Profile",
            performed_by=request.user,
            details="Suspended profile"
        )
        return Response({"status": "success", "detail": "Profile suspended successfully."})

    @action(detail=True, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request, pk=None):
        profile = MatrimonyProfile.objects.filter(id=pk, deleted_at__isnull=True).first()
        if not profile:
            return Response({"error": "Matrimony profile not found"}, status=404)
        try:
            is_admin = request.user.is_superuser or request.user.member_profile.role in ('community_admin', 'super_admin')
        except Exception:
            is_admin = False
            
        if not is_admin and profile.user != request.user:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
        logs = profile.audit_logs.all().order_by('-timestamp')
        return Response(MatrimonyAuditLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['post'], url_path='show-interest')
    def show_interest(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        sender_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
        if not sender_profile:
            return Response({"detail": "You must create a matrimony profile first"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = request.user.member_profile
            has_access, err_msg = check_member_feature_limit(member, "MATRIMONY_INTERESTS", increment=True)
            if not has_access:
                return Response({"detail": err_msg, "upgrade_required": True}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass

        target_profile = self.get_object()

        if target_profile == sender_profile:
            return Response({"detail": "You cannot show interest in your own profile"}, status=status.HTTP_400_BAD_REQUEST)

        # Check eligibility using MatrimonyRuleEngine
        from api.rule_engine import MatrimonyRuleEngine
        eligible, reason = MatrimonyRuleEngine.canSendInterest(sender_profile, target_profile)
        if not eligible:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)
            
        interest, created = InterestRequest.objects.get_or_create(
            sender=sender_profile,
            receiver=target_profile,
            defaults={'status': 'Pending'}
        )
        
        # Send Notification to target profile owner
        if target_profile.user:
            Notification.objects.create(
                recipient=target_profile.user,
                title="New Matrimony Interest",
                message=f"You have received a new matrimony interest from {sender_profile.name}.",
                notification_type="matrimony_interest"
            )

            if target_profile.user.email:
                from .emails import send_project_email
                try:
                    send_project_email(
                        recipient=target_profile.user.email,
                        template_name='matrimony_interest_received',
                        context={
                            'sender_name': sender_profile.name,
                            'sender_age': sender_profile.age,
                            'sender_city': sender_profile.city
                        },
                        trigger_event='Matrimony Interest Received'
                    )
                except Exception:
                    pass
        
        return Response(InterestRequestSerializer(interest).data)

    @action(detail=True, methods=['post'], url_path='accept-interest')
    def accept_interest(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            interest = InterestRequest.objects.get(id=pk, receiver__user=request.user)
        except InterestRequest.DoesNotExist:
            return Response({"detail": "Interest request not found"}, status=status.HTTP_404_NOT_FOUND)

        interest.status = 'Accepted'
        interest.save()
        
        # Notify sender
        if interest.sender.user:
            Notification.objects.create(
                recipient=interest.sender.user,
                title="Interest Accepted 🎉",
                message=f"{interest.receiver.name} has accepted your matrimony interest request!",
                notification_type="matrimony_interest_accepted"
            )

            if interest.sender.user.email:
                from .emails import send_project_email
                try:
                    send_project_email(
                        recipient=interest.sender.user.email,
                        template_name='matrimony_interest_accepted',
                        context={'receiver_name': interest.receiver.name},
                        trigger_event='Matrimony Interest Accepted'
                    )
                except Exception:
                    pass
        
        return Response(InterestRequestSerializer(interest).data)

    @action(detail=True, methods=['post'], url_path='reject-interest')
    def reject_interest(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            interest = InterestRequest.objects.get(id=pk, receiver__user=request.user)
        except InterestRequest.DoesNotExist:
            return Response({"detail": "Interest request not found"}, status=status.HTTP_404_NOT_FOUND)

        interest.status = 'Rejected'
        interest.save()

        # Notify sender
        if interest.sender.user:
            if interest.sender.user.email:
                from .emails import send_project_email
                try:
                    send_project_email(
                        recipient=interest.sender.user.email,
                        template_name='matrimony_interest_rejected',
                        context={'receiver_name': interest.receiver.name},
                        trigger_event='Matrimony Interest Rejected'
                    )
                except Exception:
                    pass
        
        return Response(InterestRequestSerializer(interest).data)

    @action(detail=True, methods=['post'], url_path='withdraw-interest')
    def withdraw_interest(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            interest = InterestRequest.objects.get(id=pk, sender__user=request.user)
        except InterestRequest.DoesNotExist:
            return Response({"detail": "Interest request not found"}, status=status.HTTP_404_NOT_FOUND)

        interest.delete()
        return Response({"status": "success", "detail": "Interest request withdrawn successfully."})

    @action(detail=True, methods=['post'], url_path='wishlist')
    def toggle_wishlist(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        my_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
        if not my_profile:
            return Response({"detail": "You must create a matrimony profile first"}, status=status.HTTP_400_BAD_REQUEST)

        profile = self.get_object()

        wish_item = Wishlist.objects.filter(user=request.user, profile=profile)
        if wish_item.exists():
            wish_item.delete()
            return Response({"status": "removed", "detail": "Profile removed from wishlist"})
        else:
            Wishlist.objects.create(user=request.user, profile=profile)
            return Response({"status": "added", "detail": "Profile added to wishlist"})

    @action(detail=False, methods=['get'], url_path='my-wishlist')
    def my_wishlist(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        wishlist_items = Wishlist.objects.filter(user=request.user)
        profiles = [item.profile for item in wishlist_items if item.profile.deleted_at is None]
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='interests-received')
    def interests_received(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        interests = InterestRequest.objects.filter(
            receiver__user=request.user
        ).select_related(
            'sender__user', 'sender__community',
            'receiver__user', 'receiver__community',
        ).prefetch_related(
            'sender__photos', 'receiver__photos'
        ).order_by('-created_at')
        return Response(InterestRequestSerializer(
            interests, many=True, context={'request': request}
        ).data)

    @action(detail=False, methods=['get'], url_path='interests-sent')
    def interests_sent(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        interests = InterestRequest.objects.filter(
            sender__user=request.user
        ).select_related(
            'sender__user', 'sender__community',
            'receiver__user', 'receiver__community',
        ).prefetch_related(
            'sender__photos', 'receiver__photos'
        ).order_by('-created_at')
        return Response(InterestRequestSerializer(
            interests, many=True, context={'request': request}
        ).data)

    @action(detail=True, methods=['post'], url_path='record-view')
    def record_view(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile = self.get_object()
        if profile.user != request.user:
            ProfileView.objects.create(viewer=request.user, profile=profile)
        return Response({"status": "success"})

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile_id = request.query_params.get('profile_id')
        if profile_id:
            profile = MatrimonyProfile.objects.filter(user=request.user, id=profile_id, deleted_at__isnull=True).first()
        else:
            profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()
            
        if not profile:
            return Response({
                "views": 0,
                "interestsReceived": 0,
                "interestsSent": 0,
                "wishlist": 0,
                "matches": 0
            })
            
        views_count = ProfileView.objects.filter(profile=profile).count()
        interests_received_count = InterestRequest.objects.filter(receiver=profile).count()
        interests_sent_count = InterestRequest.objects.filter(sender=profile).count()
        wishlist_count = Wishlist.objects.filter(profile=profile).count()
        matches_count = InterestRequest.objects.filter(
            Q(sender=profile, status='Accepted') | Q(receiver=profile, status='Accepted')
        ).count()
        
        return Response({
            "views": views_count,
            "interestsReceived": interests_received_count,
            "interestsSent": interests_sent_count,
            "wishlist": wishlist_count,
            "matches": matches_count
        })

    @action(detail=False, methods=['get'], url_path='matches')
    def matches(self, request):
        logger = logging.getLogger(__name__)
        if not request.user.is_authenticated:
            logger.debug("Recommended matches skipped: unauthenticated request")
            return Response([])

        profile_id = request.query_params.get('profile_id')
        if profile_id:
            my_profile = MatrimonyProfile.objects.filter(user=request.user, id=profile_id, deleted_at__isnull=True).first()
        else:
            my_profile = MatrimonyProfile.objects.filter(user=request.user, deleted_at__isnull=True).first()

        from api.preference_engine import PreferenceEngine
        import re

        # Parse query params
        search_q = request.query_params.get('search', '').strip().lower()
        location_q = request.query_params.get('location', '').strip().lower()
        q_min_age = request.query_params.get('min_age')
        q_max_age = request.query_params.get('max_age')
        q_marital_status = request.query_params.get('marital_status')
        q_caste = request.query_params.get('caste')
        q_verified_only = request.query_params.get('verified_only') == 'true'

        q_min_height = request.query_params.get('min_height')
        q_max_height = request.query_params.get('max_height')
        q_income = request.query_params.get('income')
        q_education = request.query_params.get('education')
        q_occupation = request.query_params.get('occupation')
        q_community_id = request.query_params.get('community_id')

        # Helpers for Python-level checks
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
            return True

        candidates = MatrimonyProfile.objects.filter(
            deleted_at__isnull=True,
        )
        if my_profile:
            candidates = candidates.exclude(id=my_profile.id)

        candidates = candidates.select_related(
            'user', 'community', 'partner_preference'
        ).prefetch_related(
            'selected_communities',
            'target_communities',
            'photos'
        )

        # Apply basic SQL filters
        if search_q:
            candidates = candidates.filter(
                Q(name__icontains=search_q) |
                Q(caste__icontains=search_q) |
                Q(sub_caste__icontains=search_q) |
                Q(education__icontains=search_q) |
                Q(profession__icontains=search_q)
            )

        if location_q:
            candidates = candidates.filter(
                Q(city__icontains=location_q) |
                Q(state__icontains=location_q) |
                Q(country__icontains=location_q)
            )

        if q_min_age:
            candidates = candidates.filter(age__gte=int(q_min_age))
        if q_max_age:
            candidates = candidates.filter(age__lte=int(q_max_age))

        if q_marital_status and q_marital_status.lower() != 'any':
            candidates = candidates.filter(marital_status__iexact=q_marital_status)

        if q_caste and q_caste.lower() != 'any':
            candidates = candidates.filter(caste__icontains=q_caste)

        if q_verified_only:
            candidates = candidates.filter(is_verified=True)

        if q_education:
            edu_list = [e.strip().lower() for e in q_education.split(',') if e.strip()]
            if edu_list:
                q_edu = Q()
                for edu in edu_list:
                    q_edu |= Q(education__icontains=edu)
                candidates = candidates.filter(q_edu)

        if q_occupation:
            occ_list = [o.strip().lower() for o in q_occupation.split(',') if o.strip()]
            if occ_list:
                q_occ = Q()
                for occ in occ_list:
                    q_occ |= Q(profession__icontains=occ)
                candidates = candidates.filter(q_occ)

        if q_community_id and q_community_id.lower() != 'any':
            candidates = candidates.filter(community_id=int(q_community_id))

        # Cache viewer profile and query interests
        if my_profile:
            request.user._cached_matrimony_profile = my_profile
            interests = InterestRequest.objects.filter(
                Q(sender=my_profile) | Q(receiver=my_profile)
            ).values_list('sender_id', 'receiver_id', 'status')
            request.user._cached_interests = set(interests)

        from api.rule_engine import MatrimonyRuleEngine
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        from api.preference_engine import PreferenceEngine
        
        show_outside = request.query_params.get('show_outside_preferences') == 'true'
        logger.info(f"[Matches API] Fetching matches for user profile: {my_profile.id if my_profile else 'None'} | show_outside_preferences: {show_outside}")
        
        scored_profiles = []
        for p in candidates:
            if not PrivacyVisibilityEngine.canDiscoverProfile(p, request.user):
                logger.debug(f"[Matches API] Excluded Candidate {p.id} ({p.name}) - Privacy/Discovery failed")
                continue
                
            # If show_outside_preferences is false/absent, apply preference engine filters
            if my_profile and not show_outside and not self._open_testing_enabled():
                compat = PreferenceEngine.calculate_compatibility(my_profile, p)
                if compat.get('compatibility', 0) == 0 or compat.get('failed_hard_rules'):
                    logger.info(
                        f"[Matches API] Excluded Candidate {p.id} ({p.name}) - Preference mismatched. "
                        f"Compatibility: {compat.get('compatibility')}% | Failed hard rules: {compat.get('failed_hard_rules')}"
                    )
                    continue
                else:
                    logger.info(
                        f"[Matches API] Included Candidate {p.id} ({p.name}) - Preference matched. "
                        f"Compatibility: {compat.get('compatibility')}%"
                    )

            # 4. Height Filter
            if q_min_height or q_max_height:
                inches = parse_h_to_inches(p.height)
                if inches > 0:
                    if q_min_height and inches < int(q_min_height):
                        logger.debug(f"[Matches API] Excluded Candidate {p.id} ({p.name}) - height too low")
                        continue
                    if q_max_height and inches > int(q_max_height):
                        logger.debug(f"[Matches API] Excluded Candidate {p.id} ({p.name}) - height too high")
                        continue

            # 5. Income Filter
            if q_income and not check_inc_range(p.income, q_income):
                logger.debug(f"[Matches API] Excluded Candidate {p.id} ({p.name}) - income out of range")
                continue

            if my_profile:
                details = MatrimonyRuleEngine.calculateMatchScore(my_profile, p)
                p.match_score = details["score"]
            else:
                p.match_score = 100
            scored_profiles.append(p)

        # Rank by score
        scored_profiles.sort(key=lambda x: getattr(x, 'match_score', 0), reverse=True)

        page = self.paginate_queryset(scored_profiles)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = [item for item in serializer.data if item is not None]
            return self.get_paginated_response(data)

        serializer = self.get_serializer(scored_profiles, many=True)
        data = [item for item in serializer.data if item is not None]
        return Response(data)

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-id')
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = Campaign.objects.all().order_by('-id')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        return queryset

class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.all().order_by('-date')
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = Donation.objects.all().order_by('-date')
        campaign_id = self.request.query_params.get('campaign_id')
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        return queryset

    def perform_create(self, serializer):
        donation = serializer.save()
        campaign = donation.campaign
        campaign.raised += donation.amount
        campaign.save()
        
        recipient_email = None
        if self.request.user.is_authenticated and self.request.user.email:
            recipient_email = self.request.user.email
        
        if not recipient_email:
            member = Member.objects.filter(name=donation.donor).first()
            if member and member.email:
                recipient_email = member.email
                
        if not recipient_email:
            recipient_email = self.request.data.get('email', 'socialbuzz31@gmail.com')
            
        from .emails import send_project_email
        send_project_email(
            recipient=recipient_email,
            template_name='donation_success',
            context={
                'amount': donation.amount,
                'tx_id': f"TXN{donation.id:06d}",
                'receipt_no': f"REC{donation.id:06d}"
            },
            trigger_event='Donation Success'
        )

    def perform_destroy(self, instance):
        campaign = instance.campaign
        campaign.raised = max(0, campaign.raised - instance.amount)
        campaign.save()
        instance.delete()
class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all().order_by('-date')
    serializer_class = NewsSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = News.objects.all().order_by('-date')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        category = self.request.query_params.get('category')
        
        if community_id:
            queryset = filter_by_community(queryset, community_id)
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset

class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.all().order_by('-id')
    serializer_class = FamilySerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]
    
    def get_queryset(self):
        queryset = Family.objects.all().order_by('-id')
        community_id = self.request.query_params.get('community_id') or self.request.query_params.get('communityId')
        member_id = self.request.query_params.get('member_id') or self.request.query_params.get('memberId')

        # If community_id explicitly provided, return all families for that community
        if community_id:
            return queryset.filter(community_id=community_id)

        # If member_id explicitly provided, filter by that member
        if member_id:
            return queryset.filter(member_id=member_id)

        # If authenticated with no params → return only this user's own families
        if self.request.user and self.request.user.is_authenticated:
            try:
                member = self.request.user.member_profile
                # Community admin → return all families in their community
                if member.role in ('community_admin', 'super_admin'):
                    return queryset.filter(community=member.community)
                # Regular member → return only their own families
                return queryset.filter(member=member)
            except Exception:
                pass

        return queryset.none()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # Auto-assign community and member from logged-in user
        if request.user and request.user.is_authenticated:
            try:
                member = request.user.member_profile
                if not data.get('community'):
                    data['community'] = member.community_id
                if not data.get('member'):
                    data['member'] = member.id
            except Exception:
                pass
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]

    def get_queryset(self):
        queryset = FamilyMember.objects.all()
        family_id = self.request.query_params.get('family_id') or self.request.query_params.get('familyId')
        if family_id:
            queryset = queryset.filter(family_id=family_id)
        return queryset

class EventRegistrationViewSet(viewsets.ModelViewSet):
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]

    def get_queryset(self):
        queryset = EventRegistration.objects.all()
        email = self.request.query_params.get('email')
        event_id = self.request.query_params.get('event_id') or self.request.query_params.get('eventId')
        if email:
            queryset = queryset.filter(email=email)
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            try:
                member = request.user.member_profile
                has_access, err_msg = check_member_feature_limit(member, "EVENTS_UNLIMITED", increment=True)
                if not has_access:
                    return Response({"detail": err_msg, "upgrade_required": True}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                pass
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        registration = serializer.save()
        
        # Update event attendees count
        event = registration.event
        if event:
            event.attendees = (event.attendees or 0) + registration.attendees
            event.save()
        
        # Trigger email confirmation
        if registration.email:
            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=registration.email,
                    template_name='event_registration_confirmation',
                    context={
                        'member_name': registration.name,
                        'event_title': registration.event.title if registration.event else 'Event',
                        'event_date': registration.event.date.strftime('%Y-%m-%d') if registration.event and registration.event.date else 'N/A',
                        'event_venue': registration.event.venue if registration.event else 'N/A',
                        'attendees': registration.attendees
                    },
                    trigger_event='Event Registration Confirmation'
                )
            except Exception as e:
                print("Failed to send email confirmation:", e)

    def perform_update(self, serializer):
        old_registration = self.get_object()
        old_attendees = old_registration.attendees
        registration = serializer.save()
        event = registration.event
        if event:
            event.attendees = max(0, (event.attendees or 0) - old_attendees + registration.attendees)
            event.save()

    def perform_destroy(self, instance):
        event = instance.event
        attendees_to_remove = instance.attendees
        instance.delete()
        if event:
            event.attendees = max(0, (event.attendees or 0) - attendees_to_remove)
            event.save()
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'success'})

    @action(detail=False, methods=['delete'], url_path='delete_all')
    def delete_all(self, request):
        Notification.objects.filter(recipient=request.user).delete()
        return Response({'status': 'success'})

class CommunityApprovalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CommunityApprovalHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return CommunityApprovalHistory.objects.all().order_by('-approved_date')
            
        try:
            member = user.member_profile
            if member.role == 'super_admin':
                return CommunityApprovalHistory.objects.all().order_by('-approved_date')
            elif member.role == 'community_admin':
                community = member.community
                subsidiary_ids = list(community.subsidiaries.values_list('id', flat=True))
                allowed_ids = [community.id] + subsidiary_ids
                return CommunityApprovalHistory.objects.filter(community_id__in=allowed_ids).order_by('-approved_date')
        except Member.DoesNotExist:
            pass
            
        return CommunityApprovalHistory.objects.none()

class FeatureMasterViewSet(viewsets.ModelViewSet):
    queryset = FeatureMaster.objects.all()
    serializer_class = FeatureMasterSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='scan')
    def scan_features(self, request):
        """
        Dynamically scans every sidebar/application module from django routes
        and registers them in FeatureMaster.
        """
        from api.urls import router
        discovered = set()
        for prefix, viewset, basename in router.registry:
            discovered.add(basename.replace('_', ' ').replace('-', ' ').title())

        defaults = [
            "Dashboard", "Member Management", "Family", "Hierarchy", "Committee", 
            "Events", "Jobs", "Business Directory", "Donations", "Venue", 
            "Notifications", "Messaging", "Gallery", "Matrimony", "Settings", 
            "Reports", "Analytics", "Audit Logs", "Custom Forms", "Documents", 
            "Attendance", "Property Booking"
        ]
        for d in defaults:
            discovered.add(d)

        created_count = 0
        for name in sorted(discovered):
            code = name.lower().replace(' ', '_').replace('-', '_')
            obj, created = FeatureMaster.objects.get_or_create(
                code=code,
                defaults={'name': name, 'active': True}
            )
            if created:
                created_count += 1
                
        return Response({
            "detail": f"Feature list scanned and synchronized. Created {created_count} new features.",
            "total_features": FeatureMaster.objects.count()
        })

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.filter(is_archived=False).order_by('display_order')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        # Soft delete the plan instead of hard delete to prevent ensure_plans_seeded from re-creating seeded plans
        plan.is_archived = True
        if plan.code and plan.code not in ['free', 'basic']:
            import time
            plan.code = f"{plan.code}_deleted_{int(time.time())}"
        plan.save()
        
        # Set referencing community subscriptions to None so they can fall back dynamically
        CommunitySubscription.objects.filter(plan=plan).update(plan=None)
        
        # Log audit log
        SubscriptionAuditLog.objects.create(
            plan=plan,
            field_name="is_archived",
            old_value="False",
            new_value="True",
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Soft deleted subscription plan"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        plan = self.get_object()
        new_name = request.data.get('name', f"Copy of {plan.name}")
        new_code = request.data.get('code', f"{plan.code}_copy_{random.randint(1000, 9999)}")
        
        # Clone the plan
        cloned_plan = SubscriptionPlan.objects.get(pk=plan.pk)
        cloned_plan.pk = None
        cloned_plan.name = new_name
        cloned_plan.code = new_code
        cloned_plan.save()
        
        # Clone all permissions
        perms = PlanFeaturePermission.objects.filter(plan=plan)
        for perm in perms:
            PlanFeaturePermission.objects.create(
                plan=cloned_plan,
                feature=perm.feature,
                can_view=perm.can_view,
                can_create=perm.can_create,
                can_edit=perm.can_edit,
                can_delete=perm.can_delete,
                can_export=perm.can_export,
                can_import=perm.can_import,
                can_approve=perm.can_approve,
                can_reject=perm.can_reject,
                can_assign=perm.can_assign,
                can_manage=perm.can_manage
            )
        
        # Audit Log
        SubscriptionAuditLog.objects.create(
            plan=cloned_plan,
            field_name="clone",
            old_value=str(plan.id),
            new_value=str(cloned_plan.id),
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Cloned from plan: " + plan.name
        )

        return Response(SubscriptionPlanSerializer(cloned_plan).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        plan = self.get_object()
        plan.is_archived = True
        plan.save()
        
        SubscriptionAuditLog.objects.create(
            plan=plan,
            field_name="is_archived",
            old_value="False",
            new_value="True",
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Plan archived by admin"
        )
        return Response({"detail": "Plan archived successfully."})

    @action(detail=True, methods=['post'], url_path='permissions')
    def update_permissions(self, request, pk=None):
        plan = self.get_object()
        permissions_data = request.data.get('permissions', [])
        
        for p_data in permissions_data:
            feature_id = p_data.get('feature_id')
            if not feature_id:
                continue
            feature = FeatureMaster.objects.get(pk=feature_id)
            perm, _ = PlanFeaturePermission.objects.get_or_create(plan=plan, feature=feature)
            perm.can_view = p_data.get('can_view', False)
            perm.can_create = p_data.get('can_create', False)
            perm.can_edit = p_data.get('can_edit', False)
            perm.can_delete = p_data.get('can_delete', False)
            perm.can_export = p_data.get('can_export', False)
            perm.can_import = p_data.get('can_import', False)
            perm.can_approve = p_data.get('can_approve', False)
            perm.can_reject = p_data.get('can_reject', False)
            perm.can_assign = p_data.get('can_assign', False)
            perm.can_manage = p_data.get('can_manage', False)
            perm.save()

        return Response({"detail": "Permissions updated successfully."})

    @action(detail=False, methods=['post'], url_path='validate-coupon')
    def validate_coupon(self, request):
        code = request.data.get('code', '').strip().upper()
        plan_id = request.data.get('plan_id')
        
        valid_coupons = {
            "WELCOME10": {"discount_percentage": 10, "description": "10% off on your first purchase"},
            "SAAS50": {"discount_percentage": 50, "description": "50% mega discount"},
            "FREE30": {"discount_percentage": 100, "description": "100% off for trial extend"},
            "FESTIVE25": {"discount_percentage": 25, "description": "25% festive discount"}
        }
        
        if code in valid_coupons:
            coupon_info = valid_coupons[code]
            return Response({
                "valid": True,
                "code": code,
                "discount_percentage": coupon_info["discount_percentage"],
                "description": coupon_info["description"]
            })
        
        return Response({
            "valid": False,
            "detail": "Invalid or expired coupon code."
        }, status=status.HTTP_400_BAD_REQUEST)

class PlanFeaturePermissionViewSet(viewsets.ModelViewSet):
    queryset = PlanFeaturePermission.objects.all()
    serializer_class = PlanFeaturePermissionSerializer
    permission_classes = [permissions.AllowAny]

from django.db import transaction

@transaction.atomic
def ensure_plans_seeded():
    from api.models import SubscriptionPlan, FeatureMaster, PlanFeaturePermission, CommunitySubscription, Community, FeatureUsage, ApplicationModule
    
    # 0. Seed SubscriptionPlan objects if they don't exist
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={
            "name": "Free",
            "description": "Standard free plan with basic limits",
            "monthly_price": 0,
            "yearly_price": 0,
            "max_members": 50,
            "max_family_members": 200,
            "max_events": 5,
            "max_businesses": 5,
            "max_matrimony_profiles": 5,
            "max_gallery_images": 50,
            "max_storage_gb": 1,
        }
    )
    
    SubscriptionPlan.objects.get_or_create(
        code="basic",
        defaults={
            "name": "Basic",
            "description": "Basic subscription plan",
            "monthly_price": 499,
            "yearly_price": 4999,
            "max_members": 500,
            "max_family_members": 2000,
            "max_events": 20,
            "max_businesses": 20,
            "max_matrimony_profiles": 100,
            "max_gallery_images": 500,
            "max_storage_gb": 5,
        }
    )

    # 1. Create FeatureMaster entries for all core modules if they don't exist
    core_features = [
        {"code": "dashboard", "name": "Dashboard"},
        {"code": "members", "name": "Member Management"},
        {"code": "family", "name": "Family"},
        {"code": "committee", "name": "Committee"},
        {"code": "hierarchy", "name": "Hierarchy"},
        {"code": "events", "name": "Events"},
        {"code": "jobs", "name": "Jobs"},
        {"code": "businesses", "name": "Business Directory"},
        {"code": "donations", "name": "Donations"},
        {"code": "venues", "name": "Property Booking"},
        {"code": "gallery", "name": "Gallery"},
        {"code": "matrimony", "name": "Matrimony"},
        {"code": "messages", "name": "Messages"},
        {"code": "notifications", "name": "Notifications"},
        {"code": "settings", "name": "Settings"},
        {"code": "plans", "name": "Plans"},
        {"code": "subscriptions", "name": "Subscription"},
        {"code": "attendance", "name": "Attendance"},
        {"code": "property_booking", "name": "Property Booking"},
        {"code": "analytics", "name": "Analytics"},
        {"code": "white_label", "name": "White Label"},
        {"code": "domain_mapping", "name": "Domain Mapping"},
    ]
    
    for f in core_features:
        FeatureMaster.objects.get_or_create(
            code=f["code"],
            defaults={"name": f["name"], "active": True}
        )

    # Make sure all registered ApplicationModules also exist in FeatureMaster
    for mod in ApplicationModule.objects.filter(deleted_at__isnull=True):
        FeatureMaster.objects.get_or_create(
            code=mod.module_code,
            defaults={"name": mod.display_name, "active": True}
        )

    # Setup subscription for all communities
    for comm in Community.objects.all():
        sub = CommunitySubscription.objects.filter(community=comm).first()
        if not sub:
            plan_code = (comm.plan or "basic").lower()
            plan = SubscriptionPlan.objects.filter(code=plan_code).first()
            if not plan:
                plan = SubscriptionPlan.objects.first()
            
            sub = CommunitySubscription.objects.create(
                community=comm,
                plan=plan,
                status="Active"
            )
            
            metrics = [
                ('members', plan.max_members if plan else 100),
                ('communities', plan.max_communities if plan else 5),
                ('family_members', plan.max_family_members if plan else 2000),
                ('committee_members', plan.max_committee_members if plan else 20),
                ('admin_users', plan.max_admin_users if plan else 5),
                ('staff_users', plan.max_staff_users if plan else 10),
                ('events', plan.max_events if plan else 20),
                ('venues', plan.max_venues if plan else 3),
                ('donations', plan.max_donations if plan else 50000),
                ('jobs', plan.max_jobs if plan else 20),
                ('businesses', plan.max_businesses if plan else 20),
                ('matrimony_profiles', plan.max_matrimony_profiles if plan else 100),
                ('gallery_images', plan.max_gallery_images if plan else 1000),
                ('storage', plan.max_storage_gb if plan else 5),
                ('api_calls', plan.max_api_calls if plan else 10000),
                ('notifications', plan.max_notifications if plan else 100),
                ('sms', plan.max_sms if plan else 500),
                ('email_credits', plan.max_email_credits if plan else 5000),
                ('whatsapp_credits', plan.max_whatsapp_credits if plan else 100)
            ]
            for metric, limit in metrics:
                FeatureUsage.objects.get_or_create(
                    community=comm,
                    metric=metric,
                    defaults={'max_limit': limit, 'current_usage': 0}
                )

        # Seed CommunityLicense
        from api.models import (
            CommunityLicense, CommunityModuleAccess, CommunityUsage,
            CommunityBilling, CommunityInvoice, CommunityTransaction,
            CommunityAddon, CommunityAuditLog
        )
        import uuid
        
        CommunityLicense.objects.get_or_create(
            community=comm,
            defaults={
                'license_key': f"LIC-{uuid.uuid4().hex[:12].upper()}",
                'version': '1.0',
                'status': 'Active'
            }
        )

        # Seed CommunityModuleAccess
        for fm in FeatureMaster.objects.all():
            mod = ApplicationModule.objects.filter(module_code=fm.code, deleted_at__isnull=True).first()
            if mod:
                CommunityModuleAccess.objects.get_or_create(
                    community=comm,
                    module=mod,
                    defaults={
                        'enabled': True,
                        'purchased_addon': False,
                        'usage_limit': getattr(sub.plan, f"max_{fm.code}", 0) if hasattr(sub.plan, f"max_{fm.code}") else 0,
                        'current_usage': 0
                    }
                )

        # Seed CommunityUsage
        CommunityUsage.objects.get_or_create(
            community=comm,
            defaults={
                'members': Member.objects.filter(community=comm).count(),
                'families': Family.objects.filter(community=comm).count(),
                'businesses': Business.objects.filter(community=comm).count(),
                'events': Event.objects.filter(community=comm).count(),
                'jobs': Job.objects.filter(community=comm).count(),
                'donations': Donation.objects.filter(campaign__community=comm).count(),
                'gallery': Gallery.objects.filter(community=comm).count(),
                'properties': BookingProperty.objects.filter(community=comm).count() if hasattr(comm, 'booking_properties') else 0,
                'storage': 100,  # mock storage MB
                'api': 1200,
                'sms': 450,
                'email': 2400,
                'whatsapp': 80
            }
        )

        # Seed CommunityBilling
        billing, _ = CommunityBilling.objects.get_or_create(
            community=comm,
            defaults={
                'billing_address': "123 Main Street, Community Center Complex",
                'gst': "27AAAAA1111A1Z1",
                'pan': "ABCDE1234F",
                'currency': 'INR',
                'payment_method': 'UPI / Net Banking',
                'wallet_balance': 500.00,
                'outstanding': 0.00,
                'credits': 100.00
            }
        )

        # Seed CommunityInvoice & transactions if none exist
        if not CommunityInvoice.objects.filter(community=comm).exists():
            import random
            invoice_no = f"INV-COMM-{random.randint(100000, 999999)}"
            inv = CommunityInvoice.objects.create(
                community=comm,
                invoice_no=invoice_no,
                tax=180.00,
                discount=0.00,
                coupon="",
                amount=1180.00,
                status="Paid",
                pdf_url=f"/media/invoices/{invoice_no}.pdf"
            )
            CommunityTransaction.objects.create(
                invoice=inv,
                reference=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                method="UPI",
                gateway="Razorpay",
                status="Success",
                amount=1180.00
            )

class CommunitySubscriptionViewSet(viewsets.ModelViewSet):
    queryset = CommunitySubscription.objects.all()
    serializer_class = CommunitySubscriptionSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'], url_path='check-access')
    def check_access(self, request):
        ensure_plans_seeded()
        module_code = request.query_params.get('module')
        action_name = request.query_params.get('action', 'view')
        
        if not module_code:
            return Response({"detail": "module parameter is required"}, status=400)
            
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"has_access": False, "status": "Disabled", "detail": "User not authenticated"})
            
        is_super = user.is_superuser
        try:
            member = user.member_profile
            if member and member.role == 'super_admin':
                is_super = True
        except Exception:
            member = None
            
        if is_super:
            return Response({"has_access": True, "status": "Enabled", "detail": "Super Admin access override"})
            
        if not member:
            return Response({"has_access": False, "status": "Disabled", "detail": "No member profile associated"})
            
        community = None
        try:
            community = user.member_profile.community
        except Exception:
            pass
            
        if not community:
            return Response({"has_access": False, "status": "Disabled", "detail": "No community associated"})
            
        sub = CommunitySubscription.objects.filter(community=community).first()
        if not sub:
            plan = SubscriptionPlan.objects.filter(code="basic").first()
            if not plan:
                plan = SubscriptionPlan.objects.first()
            sub = CommunitySubscription.objects.create(
                community=community,
                plan=plan,
                status="Active"
            )
            
        if sub.status in ['Expired', 'Suspended', 'Cancelled']:
            if module_code not in ['dashboard', 'settings', 'plans', 'subscriptions']:
                return Response({
                    "has_access": False,
                    "status": "Disabled",
                    "reason": f"Subscription status is {sub.status}"
                })
                
        plan = sub.plan
        
        fm = FeatureMaster.objects.filter(code=module_code).first()
        if not fm:
            mod = ApplicationModule.objects.filter(module_code=module_code, deleted_at__isnull=True).first()
            if not mod:
                return Response({"has_access": False, "status": "Disabled", "reason": "Module not registered"})
            fm, _ = FeatureMaster.objects.get_or_create(
                code=module_code,
                defaults={"name": mod.display_name, "description": mod.description or ""}
            )
            
        perm = PlanFeaturePermission.objects.filter(plan=plan, feature=fm).first()
        if not perm:
            perm = PlanFeaturePermission.objects.create(
                plan=plan,
                feature=fm,
                can_view=True,
                can_create=True,
                can_edit=True,
                can_delete=True
            )
            
        action_mapping = {
            'view': perm.can_view,
            'create': perm.can_create,
            'edit': perm.can_edit,
            'delete': perm.can_delete,
            'approve': perm.can_approve,
            'reject': perm.can_reject,
            'manage': perm.can_manage,
            'export': perm.can_export,
            'import': perm.can_import,
            'assign': perm.can_assign
        }
        
        has_perm = action_mapping.get(action_name, perm.can_view)
        
        if not has_perm:
            upgrade_required = False
            all_plans = list(SubscriptionPlan.objects.all().order_by('monthly_price'))
            for p_other in all_plans:
                if plan and p_other.monthly_price > plan.monthly_price:
                    perm_other = PlanFeaturePermission.objects.filter(plan=p_other, feature=fm).first()
                    if perm_other and getattr(perm_other, f"can_{action_name}", False):
                        upgrade_required = True
                        break
            return Response({
                "has_access": False,
                "status": "Upgrade Required" if upgrade_required else "Disabled",
                "reason": "Feature permission restricted for current plan"
            })
            
        limit_mapping = {
            "members": lambda: Member.objects.filter(community=community).count(),
            "family": lambda: Family.objects.filter(community=community).count(),
            "events": lambda: Event.objects.filter(community=community).count(),
            "businesses": lambda: Business.objects.filter(community=community).count(),
            "matrimony": lambda: MatrimonyProfile.objects.filter(community=community).count(),
            "committee": lambda: Committee.objects.filter(community=community).count(),
            "gallery": lambda: Gallery.objects.filter(community=community).count()
        }
        
        if module_code in limit_mapping:
            current_val = limit_mapping[module_code]()
            max_limit = getattr(plan, f"max_{module_code}", 0) if plan else 0
            if module_code == "members": max_limit = plan.max_members if plan else 0
            if module_code == "family": max_limit = plan.max_family_members if plan else 0
            if module_code == "committee": max_limit = plan.max_committee_members if plan else 0
            if module_code == "gallery": max_limit = plan.max_gallery_images if plan else 0
            
            if max_limit > 0 and current_val >= max_limit:
                return Response({
                    "has_access": False,
                    "status": "Limited",
                    "reason": f"Limit of {max_limit} reached for {module_code}",
                    "current": current_val,
                    "limit": max_limit
                })
                
        return Response({
            "has_access": True,
            "status": "Enabled"
        })

    @action(detail=False, methods=['get'], url_path='my-plan')
    def get_my_plan(self, request):
        ensure_plans_seeded()
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=401)
            
        community = None
        try:
            community = user.member_profile.community
        except Exception:
            pass
            
        if not community:
            community = Community.objects.first()
            if not community:
                return Response({"detail": "No community found"}, status=404)
                
        sub = CommunitySubscription.objects.filter(community=community).first()
        if not sub:
            plan = SubscriptionPlan.objects.filter(code="basic").first()
            if not plan:
                plan = SubscriptionPlan.objects.first()
            sub = CommunitySubscription.objects.create(
                community=community,
                plan=plan,
                status="Active"
            )
            
        plan = sub.plan
        
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc) if sub.end_date and sub.end_date.tzinfo else datetime.datetime.now()
        
        countdown_days = 0
        if sub.end_date:
            delta = sub.end_date - now
            countdown_days = max(0, delta.days)
            
        validity_desc = "Lifetime Access"
        if sub.end_date:
            validity_desc = f"Valid until {sub.end_date.strftime('%B %d, %Y')}"
            
        header = {
            "plan_name": plan.name if plan else "Free",
            "plan_code": plan.code if plan else "free",
            "community_name": community.name,
            "status": sub.status,
            "auto_renew": sub.auto_renew,
            "countdown_days": countdown_days,
            "validity_desc": validity_desc,
            "start_date": sub.start_date,
            "end_date": sub.end_date,
            "trial_ends_at": sub.trial_ends_at,
            "grace_period_ends_at": sub.grace_period_ends_at
        }
        
        members_count = Member.objects.filter(community=community).count()
        families_count = Family.objects.filter(community=community).count()
        events_count = Event.objects.filter(community=community).count()
        businesses_count = Business.objects.filter(community=community).count()
        matrimony_count = MatrimonyProfile.objects.filter(community=community).count()
        committee_count = Committee.objects.filter(community=community).count()
        gallery_count = Gallery.objects.filter(community=community).count()
        
        # Calculate media sizes
        import os
        from django.conf import settings
        total_size_bytes = 0
        try:
            for root, dirs, files in os.walk(settings.MEDIA_ROOT):
                for f in files:
                    fp = os.path.join(root, f)
                    if os.path.exists(fp):
                        total_size_bytes += os.path.getsize(fp)
        except Exception:
            pass
        if total_size_bytes < 1024 * 1024:
            total_size_bytes = (gallery_count * 1.5 * 1024 * 1024) + (committee_count * 0.5 * 1024 * 1024) + (1.2 * 1024 * 1024)
            
        storage_used_gb = round(total_size_bytes / (1024 * 1024 * 1024), 2)
        if storage_used_gb < 0.01:
            storage_used_gb = 0.01
            
        def get_usage(metric, default_limit):
            fu = FeatureUsage.objects.filter(community=community, metric=metric).first()
            if fu:
                return fu.current_usage, fu.max_limit
            from api.models import UsageCounter
            uc = UsageCounter.objects.filter(community=community, metric=metric).first()
            if uc:
                return uc.count, default_limit
            return 0, default_limit

        sms_used, sms_limit = get_usage('sms', plan.max_sms if plan else 100)
        email_used, email_limit = get_usage('email_credits', plan.max_email_credits if plan else 1000)
        whatsapp_used, whatsapp_limit = get_usage('whatsapp_credits', plan.max_whatsapp_credits if plan else 50)
        api_used, api_limit = get_usage('api_calls', plan.max_api_calls if plan else 1000)

        usage = [
            {"metric": "Members", "current": members_count, "limit": plan.max_members if plan else 50, "unit": ""},
            {"metric": "Families", "current": families_count, "limit": plan.max_family_members if plan else 200, "unit": ""},
            {"metric": "Events", "current": events_count, "limit": plan.max_events if plan else 5, "unit": ""},
            {"metric": "Businesses", "current": businesses_count, "limit": plan.max_businesses if plan else 5, "unit": ""},
            {"metric": "Gallery", "current": gallery_count, "limit": plan.max_gallery_images if plan else 100, "unit": ""},
            {"metric": "Matrimony Profiles", "current": matrimony_count, "limit": plan.max_matrimony_profiles if plan else 10, "unit": ""},
            {"metric": "Committee", "current": committee_count, "limit": plan.max_committee_members if plan else 5, "unit": ""},
            {"metric": "Storage", "current": storage_used_gb, "limit": plan.max_storage_gb if plan else 1, "unit": "GB"},
            {"metric": "API Calls", "current": api_used, "limit": api_limit, "unit": ""},
            {"metric": "SMS", "current": sms_used, "limit": sms_limit, "unit": ""},
            {"metric": "Email", "current": email_used, "limit": email_limit, "unit": ""},
            {"metric": "WhatsApp", "current": whatsapp_used, "limit": whatsapp_limit, "unit": ""}
        ]

        for u in usage:
            lim = u["limit"]
            if lim > 0:
                u["percentage"] = min(100, round((u["current"] / lim) * 100))
            else:
                u["percentage"] = 0
                
        features = []
        modules = ApplicationModule.objects.filter(deleted_at__isnull=True).order_by('sort_order')
        all_plans = list(SubscriptionPlan.objects.all().order_by('monthly_price'))
        
        for mod in modules:
            fm = FeatureMaster.objects.filter(code=mod.module_code).first()
            if not fm:
                continue
                
            perm = PlanFeaturePermission.objects.filter(plan=plan, feature=fm).first()
            has_view = perm.can_view if perm else False
            
            status_val = "Disabled"
            upgrade_plan_name = None
            
            if has_view:
                status_val = "Enabled"
                limit_mapping = {
                    "members": members_count,
                    "family": families_count,
                    "events": events_count,
                    "businesses": businesses_count,
                    "matrimony": matrimony_count,
                    "committee": committee_count,
                    "gallery": gallery_count
                }
                
                metric_key = mod.module_code
                if metric_key in limit_mapping:
                    cur = limit_mapping[metric_key]
                    max_lim = getattr(plan, f"max_{metric_key}", 0) if plan else 0
                    if metric_key == "members": max_lim = plan.max_members if plan else 0
                    if metric_key == "family": max_lim = plan.max_family_members if plan else 0
                    if metric_key == "committee": max_lim = plan.max_committee_members if plan else 0
                    if metric_key == "gallery": max_lim = plan.max_gallery_images if plan else 0
                    
                    if max_lim > 0:
                        if cur >= max_lim:
                            status_val = "Limited"
                        elif cur >= max_lim * 0.9:
                            status_val = "Limited"
            else:
                for p_other in all_plans:
                    if plan and p_other.monthly_price > plan.monthly_price:
                        perm_other = PlanFeaturePermission.objects.filter(plan=p_other, feature=fm).first()
                        if perm_other and perm_other.can_view:
                            status_val = "Upgrade Required"
                            upgrade_plan_name = p_other.name
                            break
                            
            features.append({
                "name": mod.display_name,
                "code": mod.module_code,
                "status": status_val,
                "upgrade_plan": upgrade_plan_name,
                "icon": mod.icon,
                "route": mod.route
            })
            
        plans_compare = []
        for p in all_plans:
            p_perms = PlanFeaturePermission.objects.filter(plan=p)
            p_features = []
            for perm in p_perms:
                if perm.can_view:
                    p_features.append(perm.feature.name)
            
            plans_compare.append({
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "monthly_price": p.monthly_price,
                "yearly_price": p.yearly_price,
                "trial_days": p.trial_days,
                "max_members": p.max_members,
                "max_storage_gb": p.max_storage_gb,
                "max_sms": p.max_sms,
                "color_theme": p.color_theme,
                "display_badge": p.display_badge,
                "is_popular": p.is_popular,
                "is_recommended": p.is_recommended,
                "is_best_value": p.is_best_value,
                "is_enterprise": p.is_enterprise,
                "description": p.description,
                "features": p_features,
                "is_current": plan is not None and p.id == plan.id
            })
            
        history = SubscriptionHistory.objects.filter(community=community).order_by('-created_at')
        billing_history = []
        for h in history:
            billing_history.append({
                "id": h.id,
                "date": h.created_at.strftime("%Y-%m-%d"),
                "plan_name": h.plan.name if h.plan else "N/A",
                "action": h.action,
                "amount": float(h.amount),
                "billing_cycle": h.billing_cycle,
                "invoice_no": h.invoice_no,
                "gst_invoice_no": h.gst_invoice_no,
                "payment_method": h.payment_method,
                "transaction_id": h.transaction_id,
                "notes": h.notes
            })
            
        system_notifications = []
        
        if countdown_days > 0 and countdown_days <= 7:
            system_notifications.append({
                "type": "warning",
                "code": "renewal_reminder",
                "message": f"Renewal Due — Your plan expires in {countdown_days} days."
            })
        elif sub.end_date and countdown_days == 0:
            system_notifications.append({
                "type": "error",
                "code": "plan_expired",
                "message": "Subscription Expired — Please renew your plan to restore full access."
            })
            
        if sub.status == "Trial" and countdown_days > 0 and countdown_days <= 3:
            system_notifications.append({
                "type": "warning",
                "code": "trial_expiring",
                "message": f"Trial Expiring — Your free trial ends in {countdown_days} days. Upgrade now!"
            })
            
        if plan and plan.max_storage_gb > 0:
            storage_percentage = (storage_used_gb / plan.max_storage_gb) * 100
            if storage_percentage >= 95:
                system_notifications.append({
                    "type": "error",
                    "code": "storage_full",
                    "message": "Storage limit reached. Uploads are disabled until you upgrade your storage."
                })
            elif storage_percentage >= 80:
                system_notifications.append({
                    "type": "warning",
                    "code": "storage_near_limit",
                    "message": f"Storage is {round(storage_percentage)}% full. Consider upgrading your plan."
                })
                
        if plan and plan.max_members > 0:
            member_percentage = (members_count / plan.max_members) * 100
            if member_percentage >= 100:
                system_notifications.append({
                    "type": "error",
                    "code": "members_full",
                    "message": "Member limit reached. You cannot add new members until you upgrade your plan."
                })
            elif member_percentage >= 90:
                system_notifications.append({
                    "type": "warning",
                    "code": "members_near_limit",
                    "message": f"Community is {round(member_percentage)}% full. Upgrade to support more members."
                })
                
        return Response({
            "header": header,
            "usage": usage,
            "features": features,
            "plans": plans_compare,
            "billing_history": billing_history,
            "notifications": system_notifications
        })

    @action(detail=False, methods=['post'], url_path='assign')
    def assign_plan(self, request):
        ensure_plans_seeded()
        community_id = request.data.get('community_id')
        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'Monthly')
        price_paid = request.data.get('price_paid', 0)
        
        community = Community.objects.get(pk=community_id)
        plan = SubscriptionPlan.objects.get(pk=plan_id)
        
        sub, created = CommunitySubscription.objects.get_or_create(
            community=community,
            defaults={'plan': plan, 'status': 'Active'}
        )
        
        old_plan_name = sub.plan.name if sub.plan else "None"
        sub.plan = plan
        sub.status = 'Active'
        
        now = datetime.datetime.now()
        sub.start_date = now
        if billing_cycle == 'Monthly':
            sub.end_date = now + datetime.timedelta(days=30)
        elif billing_cycle == 'Yearly':
            sub.end_date = now + datetime.timedelta(days=365)
        else:
            sub.end_date = None
            
        sub.save()
        
        invoice_no = f"INV-{random.randint(100000, 999999)}"
        gst_invoice_no = f"GST-{random.randint(100000, 999999)}"
        SubscriptionHistory.objects.create(
            community=community,
            plan=plan,
            action="Created" if created else "Upgraded",
            amount=price_paid,
            billing_cycle=billing_cycle,
            invoice_no=invoice_no,
            gst_invoice_no=gst_invoice_no,
            notes=f"Assigned plan {plan.name} to community {community.name}."
        )

        SubscriptionAuditLog.objects.create(
            community=community,
            field_name="plan",
            old_value=old_plan_name,
            new_value=plan.name,
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Assigned new subscription plan"
        )
        
        metrics = [
            ('members', plan.max_members),
            ('communities', plan.max_communities),
            ('family_members', plan.max_family_members),
            ('committee_members', plan.max_committee_members),
            ('admin_users', plan.max_admin_users),
            ('staff_users', plan.max_staff_users),
            ('events', plan.max_events),
            ('venues', plan.max_venues),
            ('donations', plan.max_donations),
            ('jobs', plan.max_jobs),
            ('businesses', plan.max_businesses),
            ('matrimony_profiles', plan.max_matrimony_profiles),
            ('gallery_images', plan.max_gallery_images),
            ('storage', plan.max_storage_gb),
            ('api_calls', plan.max_api_calls),
            ('notifications', plan.max_notifications),
            ('sms', plan.max_sms),
            ('email_credits', plan.max_email_credits),
            ('whatsapp_credits', plan.max_whatsapp_credits)
        ]
        
        for metric, limit in metrics:
            FeatureUsage.objects.update_or_create(
                community=community,
                metric=metric,
                defaults={'max_limit': limit}
            )

        return Response(CommunitySubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], url_path='renew')
    def renew_plan(self, request, pk=None):
        ensure_plans_seeded()
        sub = self.get_object()
        if not sub.plan:
            return Response({"detail": "Cannot renew subscription because no plan is currently assigned."}, status=status.HTTP_400_BAD_REQUEST)
            
        billing_cycle = request.data.get('billing_cycle', 'Monthly')
        price_paid = request.data.get('price_paid', sub.plan.monthly_price if billing_cycle == 'Monthly' else sub.plan.yearly_price)
        
        now = datetime.datetime.now()
        base_date = sub.end_date if sub.end_date and sub.end_date > now else now
        
        if billing_cycle == 'Monthly':
            sub.end_date = base_date + datetime.timedelta(days=30)
        elif billing_cycle == 'Yearly':
            sub.end_date = base_date + datetime.timedelta(days=365)
        else:
            sub.end_date = None
            
        sub.status = 'Active'
        sub.save()
        
        invoice_no = f"INV-{random.randint(100000, 999999)}"
        gst_invoice_no = f"GST-{random.randint(100000, 999999)}"
        SubscriptionHistory.objects.create(
            community=sub.community,
            plan=sub.plan,
            action="Renewed",
            amount=price_paid,
            billing_cycle=billing_cycle,
            invoice_no=invoice_no,
            gst_invoice_no=gst_invoice_no,
            notes=f"Renewed subscription plan {sub.plan.name}."
        )

        SubscriptionAuditLog.objects.create(
            community=sub.community,
            field_name="status",
            old_value="Grace Period / Expired",
            new_value="Active",
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Renewed subscription plan"
        )
        
        return Response(CommunitySubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_plan(self, request, pk=None):
        ensure_plans_seeded()
        sub = self.get_object()
        sub.auto_renew = False
        sub.save()
        
        SubscriptionHistory.objects.create(
            community=sub.community,
            plan=sub.plan,
            action="Cancelled Renewal",
            amount=0,
            notes="Cancelled auto-renewal of subscription plan."
        )
        
        SubscriptionAuditLog.objects.create(
            community=sub.community,
            field_name="auto_renew",
            old_value="True",
            new_value="False",
            changed_by=request.user if request.user.is_authenticated else None,
            reason="Cancelled auto-renewal"
        )
        return Response({"detail": "Auto-renewal cancelled successfully."})

    @action(detail=True, methods=['get'], url_path='usage')
    def usage_statistics(self, request, pk=None):
        ensure_plans_seeded()
        sub = self.get_object()
        usages = FeatureUsage.objects.filter(community=sub.community)
        return Response(FeatureUsageSerializer(usages, many=True).data)

class SubscriptionHistoryViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionHistory.objects.all().order_by('-created_at')
    serializer_class = SubscriptionHistorySerializer
    permission_classes = [permissions.AllowAny]

class PlanAddonViewSet(viewsets.ModelViewSet):
    queryset = PlanAddon.objects.all()
    serializer_class = PlanAddonSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='purchase')
    def purchase_addon(self, request):
        from api.models import (
            Community, PlanAddon, CommunityAddon, FeatureUsage,
            CommunityInvoice, CommunityTransaction, CommunityAuditLog
        )
        import random, uuid, datetime

        addon_id = request.data.get('addon_id')
        quantity = int(request.data.get('quantity', 1))
        community_id = request.data.get('community_id')

        if not addon_id or not community_id:
            return Response({"detail": "addon_id and community_id are required."}, status=400)

        try:
            addon = PlanAddon.objects.get(pk=addon_id)
            community = Community.objects.get(pk=community_id)
        except (PlanAddon.DoesNotExist, Community.DoesNotExist):
            return Response({"detail": "Addon or Community not found."}, status=404)

        # 1. Create/update CommunityAddon
        comm_addon, created = CommunityAddon.objects.get_or_create(
            community=community,
            addon=addon,
            defaults={'quantity': quantity, 'status': 'Active'}
        )
        if not created:
            comm_addon.quantity += quantity
            comm_addon.save()

        # 2. Update FeatureUsage limit
        fu = FeatureUsage.objects.filter(community=community, metric=addon.limit_type).first()
        if fu:
            fu.max_limit += addon.limit_value * quantity
            fu.save()

        # 3. Create Invoice & Transaction
        total_amount = addon.price * quantity
        invoice_no = f"INV-ADDON-{random.randint(100000, 999999)}"
        inv = CommunityInvoice.objects.create(
            community=community,
            invoice_no=invoice_no,
            tax=total_amount * 0.18,
            discount=0.00,
            coupon="",
            amount=total_amount * 1.18,
            status="Paid",
            pdf_url=f"/media/invoices/{invoice_no}.pdf"
        )
        CommunityTransaction.objects.create(
            invoice=inv,
            reference=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            method="Stripe / Card",
            gateway="Razorpay",
            status="Success",
            amount=total_amount * 1.18
        )

        # 4. Audit Log
        CommunityAuditLog.objects.create(
            community=community,
            user=request.user if request.user.is_authenticated else None,
            action="Add-on Purchased",
            old_value=str(comm_addon.quantity - quantity if not created else 0),
            new_value=str(comm_addon.quantity),
            reason=f"Purchased add-on: {addon.name} x {quantity}"
        )

        return Response({
            "detail": f"Successfully purchased {addon.name} x {quantity}.",
            "addon": {
                "id": comm_addon.id,
                "addon_id": addon.id,
                "addon_name": addon.name,
                "quantity": comm_addon.quantity
            }
        })

class FeatureUsageViewSet(viewsets.ModelViewSet):
    queryset = FeatureUsage.objects.all()
    serializer_class = FeatureUsageSerializer
    permission_classes = [permissions.AllowAny]

class SubscriptionAuditLogViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionAuditLog.objects.all().order_by('-date')
    serializer_class = SubscriptionAuditLogSerializer
    permission_classes = [permissions.AllowAny]

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]

class AdvertisementViewSet(viewsets.ModelViewSet):
    queryset = Advertisement.objects.all().order_by('-created_at')
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]

class GalleryViewSet(viewsets.ModelViewSet):
    serializer_class = GallerySerializer
    permission_classes = [permissions.AllowAny, HasCustomRolePermission]

    def get_queryset(self):
        queryset = Gallery.objects.all().order_by('-uploaded_at')
        community_id = self.request.query_params.get('communityId')
        if community_id:
            queryset = queryset.filter(community_id=community_id)
        return queryset

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        if not email:
            return Response({"detail": "Email field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        email = email.strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "No user found with this email address."}, status=status.HTTP_404_NOT_FOUND)

        otp_code = str(random.randint(100000, 999999))
        expiry_time = datetime.datetime.now() + datetime.timedelta(minutes=10)
        OTP_STORE[email] = {
            'otp': otp_code,
            'expiry_time': expiry_time,
            'attempt_count': 0,
            'purpose': 'forgot_password'
        }

        # IMPORTANT: all otp's must also show in terminal
        import sys
        print(f"\n{'='*60}")
        print(f"[OTP] FORGOT PASSWORD OTP")
        print(f"[OTP] Email   : {email}")
        print(f"[OTP] Code    : {otp_code}")
        print(f"[OTP] Expiry  : {expiry_time}")
        print(f"{'='*60}\n")
        sys.stdout.flush()

        from .emails import send_project_email
        try:
            send_project_email(
                recipient=email,
                template_name='forgot_password_otp',
                context={'otp_code': otp_code},
                trigger_event='Forgot Password OTP'
            )
        except Exception as e:
            print(f"Failed to send forgot password email: {e}")

        return Response({"detail": "OTP sent successfully to your email address."})

class VerifyForgotOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({"detail": "Email and OTP fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()
        otp_data = OTP_STORE.get(email)
        if not otp_data or otp_data.get('purpose') != 'forgot_password':
            import sys
            sys.stderr.write(f"\n[DEBUG] VerifyForgotOTPView lookup failed for email: '{email}'. Current OTP_STORE keys: {list(OTP_STORE.keys())}\n")
            sys.stderr.flush()
            return Response({"detail": "No OTP session found for this email."}, status=status.HTTP_400_BAD_REQUEST)

        # Increment attempt count
        otp_data['attempt_count'] = otp_data.get('attempt_count', 0) + 1

        if otp_data['attempt_count'] > 3:
            OTP_STORE.pop(email, None)
            return Response({"detail": "Too many attempts. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiry
        if datetime.datetime.now() > otp_data['expiry_time']:
            OTP_STORE.pop(email, None)
            return Response({"detail": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate OTP
        if otp_data['otp'] != otp:
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as verified in the store
        otp_data['verified'] = True
        return Response({"detail": "OTP verified successfully."})

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not email or not otp or not new_password or not confirm_password:
            return Response({"detail": "Email, OTP, new password, and confirm password fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()
        if new_password != confirm_password:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        otp_data = OTP_STORE.get(email)
        if not otp_data or otp_data.get('purpose') != 'forgot_password':
            import sys
            sys.stderr.write(f"\n[DEBUG] ResetPasswordView lookup failed for email: '{email}'. Current OTP_STORE keys: {list(OTP_STORE.keys())}\n")
            sys.stderr.flush()
            return Response({"detail": "No OTP session found. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if verified or verify now
        if not otp_data.get('verified', False):
            otp_data['attempt_count'] = otp_data.get('attempt_count', 0) + 1
            if otp_data['attempt_count'] > 3:
                OTP_STORE.pop(email, None)
                return Response({"detail": "Too many attempts. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)
            if datetime.datetime.now() > otp_data['expiry_time']:
                OTP_STORE.pop(email, None)
                return Response({"detail": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
            if otp_data['otp'] != otp:
                return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
            user.set_password(new_password)
            user.save()
            
            OTP_STORE.pop(email, None)

            from .emails import send_project_email
            try:
                send_project_email(
                    recipient=email,
                    template_name='password_changed_successfully',
                    context={},
                    trigger_event='Password Changed Successfully'
                )
            except Exception as e:
                print(f"Failed to send password changed email: {e}")

            return Response({"detail": "Password has been reset successfully. Please login."})
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class RegisterSendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        if not email:
            return Response({"detail": "Email field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        email = email.strip().lower()
        otp_code = str(random.randint(100000, 999999))
        expiry_time = datetime.datetime.now() + datetime.timedelta(minutes=10)
        OTP_STORE[email] = {
            'otp': otp_code,
            'expiry_time': expiry_time,
            'attempt_count': 0,
            'purpose': 'register'
        }

        # IMPORTANT: all otp's must also show in terminal
        import sys
        sys.stderr.write(f"\n============================================================\n[REGISTRATION OTP] Email: {email} | OTP: {otp_code} | Expiry: {expiry_time}\n============================================================\n")
        sys.stderr.flush()

        from .emails import send_project_email
        try:
            send_project_email(
                recipient=email,
                template_name='forgot_password_otp',
                context={'otp_code': otp_code},
                trigger_event='Registration OTP'
            )
        except Exception as e:
            print(f"Failed to send registration email: {e}")

        return Response({"detail": "OTP sent successfully to your email address."})

class RegisterVerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({"detail": "Email and OTP fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()
        otp_data = OTP_STORE.get(email)
        if not otp_data or otp_data.get('purpose') != 'register':
            return Response({"detail": "No OTP session found for this email."}, status=status.HTTP_400_BAD_REQUEST)

        # Increment attempt count
        otp_data['attempt_count'] = otp_data.get('attempt_count', 0) + 1

        if otp_data['attempt_count'] > 3:
            OTP_STORE.pop(email, None)
            return Response({"detail": "Too many attempts. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiry
        if datetime.datetime.now() > otp_data['expiry_time']:
            OTP_STORE.pop(email, None)
            return Response({"detail": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate OTP
        if otp_data['otp'] != otp:
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is valid! Activate/Verify the member profile
        try:
            member = Member.objects.get(email__iexact=email)
            member.email_verified = True
            member.save()

            if member.user:
                member.user.is_active = True
                member.user.save()

            OTP_STORE.pop(email, None)
            return Response({"detail": "OTP verified successfully."})
        except Member.DoesNotExist:
            return Response({"detail": "Member profile not found for this email."}, status=status.HTTP_404_NOT_FOUND)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"detail": "old_password and new_password fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"detail": "Incorrect old password."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        from .emails import send_project_email
        send_project_email(
            recipient=user.email,
            template_name='password_changed_successfully',
            context={},
            trigger_event='Password Changed Successfully'
        )

        return Response({"detail": "Password changed successfully."})

from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from api.models import MessageRequest, Conversation, Message, Member, Notification, MessageReaction
from api.serializers import MessageRequestSerializer, ConversationSerializer, MessageSerializer

class MessageRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MessageRequestSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission]

    def get_queryset(self):
        member = Member.objects.filter(user=self.request.user).first()
        if not member:
            return MessageRequest.objects.none()
        
        queryset = MessageRequest.objects.filter(Q(sender=member) | Q(receiver=member))
        
        role = self.request.query_params.get('role')
        status_filter = self.request.query_params.get('status')
        
        if role == 'sender':
            queryset = queryset.filter(sender=member)
        elif role == 'receiver':
            queryset = queryset.filter(receiver=member)
            
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        sender_member = Member.objects.filter(user=request.user).first()
        if not sender_member:
            return Response({"detail": "User has no associated member profile."}, status=status.HTTP_400_BAD_REQUEST)
        
        receiver_id = request.data.get('receiver') or request.data.get('receiver_id')
        if not receiver_id:
            return Response({"detail": "Receiver is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            receiver_member = Member.objects.get(id=receiver_id)
        except Member.DoesNotExist:
            return Response({"detail": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if sender_member.id == receiver_member.id:
            return Response({"detail": "You cannot send a message request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        existing_request = MessageRequest.objects.filter(
            Q(sender=sender_member, receiver=receiver_member) |
            Q(sender=receiver_member, receiver=sender_member)
        ).first()

        if existing_request:
            if existing_request.status == 'pending':
                return Response({"detail": "A message request is already pending between you and this member."}, status=status.HTTP_400_BAD_REQUEST)
            elif existing_request.status == 'approved':
                return Response({"detail": "You are already connected with this member. Open chat to message them."}, status=status.HTTP_400_BAD_REQUEST)
            elif existing_request.status == 'rejected':
                if existing_request.sender == sender_member:
                    time_diff = timezone.now() - existing_request.updated_at
                    if time_diff < timedelta(days=7):
                        days_left = 7 - time_diff.days
                        return Response({
                            "detail": f"Your request was declined. You can request again in {days_left if days_left > 0 else 1} days."
                        }, status=status.HTTP_400_BAD_REQUEST)
                existing_request.delete()

        req = MessageRequest.objects.create(
            sender=sender_member,
            receiver=receiver_member,
            subject=request.data.get('subject', ''),
            introduction_message=request.data.get('introduction_message', ''),
            reason=request.data.get('reason', 'General Inquiry'),
            custom_reason=request.data.get('custom_reason', ''),
            status='pending'
        )

        if receiver_member.user:
            Notification.objects.create(
                recipient=receiver_member.user,
                title="New Connection Request",
                message=f"{sender_member.name} wants to connect with you.",
                notification_type="Connection"
            )

        serializer = MessageRequestSerializer(req, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        member = Member.objects.filter(user=request.user).first()
        if not member or req.receiver != member:
            return Response({"detail": "Not authorized to approve this request."}, status=status.HTTP_403_FORBIDDEN)
        
        if req.status != 'pending':
            return Response({"detail": f"Request is already {req.status}."}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'approved'
        req.save()

        conv = Conversation.objects.filter(
            (Q(participant_1=req.sender) & Q(participant_2=req.receiver)) |
            (Q(participant_1=req.receiver) & Q(participant_2=req.sender))
        ).first()

        if not conv:
            conv = Conversation.objects.create(
                participant_1=req.sender,
                participant_2=req.receiver
            )

        Message.objects.create(
            conversation=conv,
            sender=req.sender,
            content=req.introduction_message or "Let's connect!"
        )

        if req.sender.user:
            Notification.objects.create(
                recipient=req.sender.user,
                title="Connection Approved",
                message="Your message request has been approved. You can now start chatting.",
                notification_type="Connection"
            )

        return Response({"status": "approved", "detail": "Message request approved successfully."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        member = Member.objects.filter(user=request.user).first()
        if not member or req.receiver != member:
            return Response({"detail": "Not authorized to reject this request."}, status=status.HTTP_403_FORBIDDEN)
        
        if req.status != 'pending':
            return Response({"detail": f"Request is already {req.status}."}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'rejected'
        req.save()

        if req.sender.user:
            Notification.objects.create(
                recipient=req.sender.user,
                title="Connection Declined",
                message="Your connection request was declined.",
                notification_type="Connection"
            )

        return Response({"status": "rejected", "detail": "Message request rejected successfully."})

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission]

    def get_queryset(self):
        member = Member.objects.filter(user=self.request.user).first()
        if not member:
            return Conversation.objects.none()
        
        return Conversation.objects.filter(Q(participant_1=member) | Q(participant_2=member)).order_by('-created_at')

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conv = self.get_object()
        member = Member.objects.filter(user=request.user).first()
        if not member or (conv.participant_1 != member and conv.participant_2 != member):
            return Response({"detail": "Not authorized to view messages in this conversation."}, status=status.HTTP_403_FORBIDDEN)
        
        conv.messages.exclude(sender=member).update(is_seen=True)
        
        msgs = conv.messages.all().order_by('created_at')
        serializer = MessageSerializer(msgs, many=True, context={'request': request})
        return Response(serializer.data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission]

    def get_queryset(self):
        member = Member.objects.filter(user=self.request.user).first()
        if not member:
            return Message.objects.none()
        return Message.objects.filter(conversation__participant_1=member) | Message.objects.filter(conversation__participant_2=member)

    def create(self, request, *args, **kwargs):
        sender_member = Member.objects.filter(user=request.user).first()
        if not sender_member:
            return Response({"detail": "User has no associated member profile."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            has_access, err_msg = check_member_feature_limit(sender_member, "UNLIMITED_CHAT", increment=True)
            if not has_access:
                return Response({"detail": err_msg, "upgrade_required": True}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass
        
        conversation_id = request.data.get('conversation') or request.data.get('conversation_id')
        if not conversation_id:
            return Response({"detail": "Conversation ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if conv.participant_1 != sender_member and conv.participant_2 != sender_member:
            return Response({"detail": "Not a participant in this conversation."}, status=status.HTTP_403_FORBIDDEN)
            
        content = request.data.get('content', '')
        image = request.FILES.get('image')
        file_attachment = request.FILES.get('file')
        reply_to_id = request.data.get('reply_to_id')
        
        if not content and not image and not file_attachment:
            return Response({"detail": "Message content or attachment is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        reply_to = None
        if reply_to_id:
            try:
                reply_to = Message.objects.get(id=reply_to_id)
            except Message.DoesNotExist:
                pass
                
        msg = Message.objects.create(
            conversation=conv,
            sender=sender_member,
            content=content,
            image=image,
            file=file_attachment,
            reply_to=reply_to
        )
        
        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        msg = self.get_object()
        member = Member.objects.filter(user=request.user).first()
        if not member:
            return Response({"detail": "User has no associated member profile."}, status=status.HTTP_400_BAD_REQUEST)
        
        emoji = request.data.get('emoji')
        
        existing_rx = MessageReaction.objects.filter(message=msg, member=member).first()
        if existing_rx:
            if not emoji or existing_rx.emoji == emoji:
                existing_rx.delete()
                action_taken = "removed"
            else:
                existing_rx.emoji = emoji
                existing_rx.save()
                action_taken = "updated"
        else:
            if emoji:
                MessageReaction.objects.create(message=msg, member=member, emoji=emoji)
                action_taken = "added"
            else:
                action_taken = "no_action"
                
        serializer = self.get_serializer(msg)
        return Response({
            "status": "success",
            "action": action_taken,
            "message_id": msg.id,
            "reactions": serializer.data.get('reactions', [])
        })
    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        sender_member = Member.objects.filter(user=request.user).first()
        if not sender_member or msg.sender != sender_member:
            return Response({"detail": "You can only delete your own messages."}, status=status.HTTP_403_FORBIDDEN)
        
        msg.delete()
        return Response({"detail": "Message deleted."}, status=status.HTTP_204_NO_CONTENT)


from .models import (
    BookingProperty, PropertyResource, ResourcePricing, ResourceLock,
    VenueBooking, BookingInspection, BookingRefund, BookingWaitingList,
    ResourceDependency
)
from .serializers import (
    BookingPropertySerializer, PropertyResourceSerializer, ResourcePricingSerializer,
    ResourceLockSerializer, VenueBookingSerializer, BookingInspectionSerializer,
    BookingRefundSerializer, BookingWaitingListSerializer, ResourceDependencySerializer
)

class BookingPropertyViewSet(viewsets.ModelViewSet):
    serializer_class = BookingPropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _member(self):
        return Member.objects.filter(user=self.request.user).select_related('community').first()

    def _is_super_admin(self, member=None):
        return self.request.user.is_superuser or (member and member.role == 'super_admin')

    def get_queryset(self):
        user = self.request.user
        member = self._member()
        if not member:
            if user.is_superuser:
                return BookingProperty.objects.all()
            return BookingProperty.objects.none()

        if self._is_super_admin(member):
            return BookingProperty.objects.all()
        elif member.role == 'community_admin':
            return BookingProperty.objects.filter(community=member.community)
        
        community_ids = {member.community.id}
        curr = member.community
        while curr and curr.parent_id:
            community_ids.add(curr.parent_id)
            curr = curr.parent
            
        def get_descendants(c):
            ids = set()
            for child in c.subsidiaries.all():
                ids.add(child.id)
                ids.update(get_descendants(child))
            return ids
        community_ids.update(get_descendants(member.community))
        
        filter_comm = self.request.query_params.get('community')
        if filter_comm and str(filter_comm).isdigit() and int(filter_comm) in community_ids:
            return BookingProperty.objects.filter(community_id=int(filter_comm), status='Approved', notified=True)

        return BookingProperty.objects.filter(community_id__in=community_ids, status='Approved', notified=True)

    def perform_create(self, serializer):
        user = self.request.user
        member = self._member()
        status = 'Approved' if self._is_super_admin(member) else 'Pending Approval'
        is_approved = status == 'Approved'
        
        photos_data = self.request.data.get('photos')
        import json
        if isinstance(photos_data, str):
            try:
                photos = json.loads(photos_data)
            except:
                photos = [photos_data]
        elif isinstance(photos_data, list):
            photos = photos_data
        else:
            photos = list(serializer.validated_data.get('photos', []))

        if 'uploaded_photos' in self.request.FILES:
            from django.core.files.storage import default_storage
            for f in self.request.FILES.getlist('uploaded_photos'):
                path = default_storage.save(f'property_photos/{f.name}', f)
                photos.append(default_storage.url(path))

        if member and member.community:
            serializer.save(community=member.community, status=status, photos=photos, notified=is_approved)
        else:
            community_id = self.request.data.get('community')
            community = None
            if community_id:
                try:
                    community = Community.objects.get(id=community_id)
                except (Community.DoesNotExist, ValueError):
                    pass
            if not community:
                community = Community.objects.first()
            if not community:
                from rest_framework import serializers
                raise serializers.ValidationError({"community": "A community must exist before creating properties."})
            serializer.save(community=community, status=status, photos=photos, notified=is_approved)

    def perform_update(self, serializer):
        member = self._member()
        instance = self.get_object()
        
        photos_data = self.request.data.get('photos')
        import json
        if isinstance(photos_data, str):
            try:
                photos = json.loads(photos_data)
            except:
                photos = [photos_data]
        elif isinstance(photos_data, list):
            photos = photos_data
        else:
            photos = list(serializer.validated_data.get('photos', instance.photos))

        if 'uploaded_photos' in self.request.FILES:
            from django.core.files.storage import default_storage
            for f in self.request.FILES.getlist('uploaded_photos'):
                path = default_storage.save(f'property_photos/{f.name}', f)
                photos.append(default_storage.url(path))

        if self._is_super_admin(member):
            new_status = instance.status
            serializer.save(status=new_status, photos=photos, notified=(new_status == 'Approved'))
        elif member and member.role == 'community_admin' and instance.community_id == member.community_id:
            # Updating a property by community admin resets its status to Pending Approval for Super Admin review
            serializer.save(status='Pending Approval', rejection_reason='', photos=photos, notified=False)
        else:
            serializer.save(community=instance.community, status='Pending Approval', rejection_reason='', photos=photos, notified=False)

    def destroy(self, request, *args, **kwargs):
        member = self._member()
        instance = self.get_object()
        if not self._is_super_admin(member) and (not member or member.role != 'community_admin' or instance.community_id != member.community_id):
            return Response({'error': 'You can delete only properties from your own community.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        member = self._member()
        prop = self.get_object()
        if not self._is_super_admin(member):
            return Response({'error': 'Only Super Admins can approve properties.'}, status=403)
        prop.status = 'Approved'
        prop.rejection_reason = ''
        prop.notified = True
        prop.save()
        return Response({'status': 'Approved successfully'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        member = self._member()
        prop = self.get_object()
        if not self._is_super_admin(member):
            return Response({'error': 'Only Super Admins can reject properties.'}, status=403)
        reason = str(request.data.get('rejection_reason', '')).strip()
        if not reason:
            return Response({'rejection_reason': 'Rejection reason is required.'}, status=400)
        prop.status = 'Rejected'
        prop.rejection_reason = reason
        prop.save()
        return Response({'status': 'Rejected successfully'})

    @action(detail=True, methods=['post'])
    def notify(self, request, pk=None):
        member = self._member()
        prop = self.get_object()
        if not member or member.role != 'community_admin' or prop.community_id != member.community_id:
            return Response({'error': 'Only the community admin of this property can notify members.'}, status=403)
        if prop.status != 'Approved':
            return Response({'error': 'Only approved properties can be notified.'}, status=400)
        prop.notified = True
        prop.save()
        
        # Send notifications to all community members
        from api.models import Member
        community_members = Member.objects.filter(community=prop.community, role='member').select_related('user')
        for m in community_members:
            if m.user:
                _notify_user(
                    user=m.user,
                    title=f"New Venue Available: {prop.name}",
                    message=f"A new venue '{prop.name}' is now available for booking in your community! Check it out.",
                    notification_type='booking'
                )
        return Response({'status': 'Notified successfully'})

    @action(detail=True, methods=['post'])
    def check_availability(self, request, pk=None):
        property_obj = self.get_object()
        resource_ids = request.data.get('resource_ids') or []
        if not resource_ids and request.data.get('entire_property'):
            resource_ids = list(property_obj.resources.filter(status='Active').values_list('id', flat=True))
        try:
            start_date, end_date, start_time, end_time, start_dt, end_dt = _parse_booking_request(request.data)
            resource_ids = [int(rid) for rid in resource_ids]
        except Exception as exc:
            return Response({'error': str(exc) or 'Invalid date or time format.'}, status=400)

        all_available, details = _availability_for_resources(property_obj, resource_ids, start_dt, end_dt)
        selected_resources = property_obj.resources.filter(id__in=resource_ids, status='Active')
        pricing = _calculate_booking_price(selected_resources, start_dt, end_dt, request.data.get('extra_charges', 0), property_obj.tax_percentage, property_obj.security_deposit)
        suggestions = []
        if not all_available:
            other_resources = property_obj.resources.exclude(id__in=resource_ids).filter(status='Active')
            for res in other_resources:
                available, alt_details = _availability_for_resources(property_obj, [res.id], start_dt, end_dt)
                if available:
                    suggestions.append({
                        'id': res.id,
                        'name': res.name,
                        'resource_type': res.resource_type
                    })
                    
        return Response({
            'available': all_available,
            'status': 'available' if all_available else 'partial' if any(d['status'] == 'partial' for d in details) else 'unavailable',
            'details': details,
            'pricing': pricing,
            'suggestions': suggestions
        })

    @action(detail=True, methods=['post'])
    def calculate_price(self, request, pk=None):
        property_obj = self.get_object()
        resource_ids = request.data.get('resource_ids') or []
        if not resource_ids and request.data.get('entire_property'):
            resource_ids = list(property_obj.resources.filter(status='Active').values_list('id', flat=True))
        try:
            start_date, end_date, start_time, end_time, start_dt, end_dt = _parse_booking_request(request.data)
            resource_ids = [int(rid) for rid in resource_ids]
        except Exception as exc:
            return Response({'error': str(exc) or 'Invalid date or time format.'}, status=400)
        resources = property_obj.resources.filter(id__in=resource_ids, status='Active')
        return Response(_calculate_booking_price(resources, start_dt, end_dt, request.data.get('extra_charges', 0), property_obj.tax_percentage, property_obj.security_deposit))

class PropertyResourceViewSet(viewsets.ModelViewSet):
    serializer_class = PropertyResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return PropertyResource.objects.all()
        if member and member.role == 'community_admin':
            return PropertyResource.objects.filter(property__community=member.community)
        if member:
            return PropertyResource.objects.filter(property__community=member.community, property__status='Approved', status='Active')
        return PropertyResource.objects.none()

    def perform_create(self, serializer):
        member = Member.objects.filter(user=self.request.user).first()
        prop = serializer.validated_data.get('property')
        if not (self.request.user.is_superuser or (member and member.role == 'super_admin')):
            if not member or member.role != 'community_admin' or prop.community_id != member.community_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can add resources only to properties in your community.')
        serializer.save()

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        member = Member.objects.filter(user=request.user).first()

        # --- New format: { resources: [{property, name, ...}, ...] } ---
        resources_list = request.data.get('resources')
        if resources_list and isinstance(resources_list, list):
            if not resources_list:
                return Response({'error': 'Resources list is empty.'}, status=400)

            # Validate property from the first item (all items must share the same property)
            prop_id = resources_list[0].get('property')
            prop = BookingProperty.objects.filter(id=prop_id).first()
            if not prop:
                return Response({'error': f'Property with id={prop_id} not found'}, status=404)

            if not (request.user.is_superuser or (member and member.role == 'super_admin')):
                if not member or member.role != 'community_admin' or prop.community_id != member.community_id:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied('You can add resources only to properties in your community.')

            created = []
            errors = []
            for i, item in enumerate(resources_list):
                serializer = self.get_serializer(data=item)
                if serializer.is_valid():
                    self.perform_create(serializer)
                    created.append(serializer.data)
                else:
                    errors.append({'index': i, 'errors': serializer.errors})

            if errors and not created:
                return Response({'error': 'Validation failed for all resources', 'details': errors}, status=400)

            return Response(
                {'message': f'Successfully created {len(created)} resources', 'resources': created, 'errors': errors},
                status=201
            )

        # --- Legacy format: single property + prefix + range_start + range_end ---
        prop_id = request.data.get('property')
        prefix = request.data.get('prefix', 'Room')
        start_idx = int(request.data.get('range_start', 1))
        end_idx = int(request.data.get('range_end', 1))

        prop = BookingProperty.objects.filter(id=prop_id).first()
        if not prop:
            return Response({'error': 'Property not found'}, status=404)

        if not (request.user.is_superuser or (member and member.role == 'super_admin')):
            if not member or member.role != 'community_admin' or prop.community_id != member.community_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can add resources only to properties in your community.')

        base_data = request.data.copy()
        base_data.pop('prefix', None)
        base_data.pop('range_start', None)
        base_data.pop('range_end', None)

        created = []
        for i in range(start_idx, end_idx + 1):
            data = base_data.copy()
            data['name'] = f"{prefix} {i}"
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            created.append(serializer.data)

        return Response({'message': f'Successfully created {len(created)} resources', 'resources': created}, status=201)

    def perform_update(self, serializer):
        member = Member.objects.filter(user=self.request.user).first()
        instance = self.get_object()
        target_property = serializer.validated_data.get('property', instance.property)
        if not (self.request.user.is_superuser or (member and member.role == 'super_admin')):
            if not member or member.role != 'community_admin' or target_property.community_id != member.community_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can manage resources only in your community.')
        serializer.save()

class ResourcePricingViewSet(viewsets.ModelViewSet):
    serializer_class = ResourcePricingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return ResourcePricing.objects.all()
        if member and member.role == 'community_admin':
            return ResourcePricing.objects.filter(resource__property__community=member.community)
        if member:
            return ResourcePricing.objects.filter(resource__property__community=member.community, resource__property__status='Approved', resource__status='Active')
        return ResourcePricing.objects.none()

    def perform_create(self, serializer):
        member = Member.objects.filter(user=self.request.user).first()
        resource = serializer.validated_data.get('resource')
        if not (self.request.user.is_superuser or (member and member.role == 'super_admin')):
            if not member or member.role != 'community_admin' or resource.property.community_id != member.community_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can price resources only in your community.')
        serializer.save()

class ResourceDependencyViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceDependencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return ResourceDependency.objects.all()
        if member and member.role == 'community_admin':
            return ResourceDependency.objects.filter(resource__property__community=member.community)
        if member:
            return ResourceDependency.objects.filter(resource__property__community=member.community, resource__property__status='Approved', resource__status='Active')
        return ResourceDependency.objects.none()

    def perform_create(self, serializer):
        member = Member.objects.filter(user=self.request.user).first()
        resource = serializer.validated_data.get('resource')
        if not (self.request.user.is_superuser or (member and member.role == 'super_admin')):
            if not member or member.role != 'community_admin' or resource.property.community_id != member.community_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can manage dependencies only in your community.')
        serializer.save()


class VenueBookingViewSet(viewsets.ModelViewSet):
    serializer_class = VenueBookingSerializer
    permission_classes = [permissions.IsAuthenticated, MemberPremiumModulePermission]

    def _member(self):
        return Member.objects.filter(user=self.request.user).select_related('community').first()

    def _is_admin_for_booking(self, booking, member=None):
        member = member or self._member()
        return self.request.user.is_superuser or (
            member and member.role in ['super_admin', 'community_admin'] and booking.property.community_id == member.community_id
        )

    def get_queryset(self):
        user = self.request.user
        member = self._member()
        if not member:
            return VenueBooking.objects.none()

        if user.is_superuser or member.role == 'super_admin':
            return VenueBooking.objects.all()
        elif member.role == 'community_admin':
            return VenueBooking.objects.filter(property__community=member.community)
            
        return VenueBooking.objects.filter(member=member)

    def perform_create(self, serializer):
        user = self.request.user
        member = self._member()
        prop = serializer.validated_data.get('property')
        if prop and prop.status != 'Approved':
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'property': 'Only approved properties can be booked.'})
        resources = list(serializer.validated_data.get('resources') or [])
        if not resources:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'resources': 'Select at least one resource.'})
        if any(res.property_id != prop.id or res.status != 'Active' for res in resources):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'resources': 'All selected resources must be active and belong to the selected property.'})

        start_date = serializer.validated_data.get('start_date')
        end_date = serializer.validated_data.get('end_date')
        start_time = serializer.validated_data.get('start_time')
        end_time = serializer.validated_data.get('end_time')
        start_dt, end_dt = _booking_window(start_date, end_date, start_time, end_time)
        if end_dt <= start_dt:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'end_time': 'End time must be after start time.'})

        duration_hours = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
        duration_errors = []
        for res in resources:
            if duration_hours < Decimal(str(res.min_booking_duration_hours)):
                duration_errors.append(f'{res.name}: minimum {res.min_booking_duration_hours} hour(s)')
            if duration_hours > Decimal(str(res.max_booking_duration_hours)):
                duration_errors.append(f'{res.name}: maximum {res.max_booking_duration_hours} hour(s)')
        if duration_errors:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'duration': duration_errors})

        # Validate Dependencies
        selected_ids = {res.id for res in resources}
        
        # 1. Parent -> Child Dependency
        # Rule: If resource A is booked, then its required resources MUST be booked.
        for res in resources:
            for dep in res.dependencies.filter(dependency_type='parent_child'):
                if dep.requires.id not in selected_ids:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({'resources': f'{res.name} requires {dep.requires.name} to be booked together.'})

        # 2. Combination Dependency
        # Rule: If ALL condition resources (the ones pointing TO a target) are booked, the target MUST be booked.
        # Group combination dependencies by their target (`requires`)
        all_property_resources = prop.resources.filter(status='Active').prefetch_related('required_by')
        for target_res in all_property_resources:
            # Get all combination rules pointing TO this target
            combo_deps = target_res.required_by.filter(dependency_type='combination')
            if not combo_deps.exists():
                continue
            
            # If all the sources (condition resources) are in selected_ids, then the target_res MUST be in selected_ids
            # Example: 101->Hall, 102->Hall. If selected_ids has 101 and 102, then Hall is required.
            condition_resource_ids = {dep.resource.id for dep in combo_deps}
            
            if condition_resource_ids.issubset(selected_ids):
                # All condition resources are met. Is the target selected?
                if target_res.id not in selected_ids:
                    from rest_framework.exceptions import ValidationError
                    # Get the names of the condition resources to show in the error
                    condition_names = [dep.resource.name for dep in combo_deps]
                    raise ValidationError({'resources': f'{target_res.name} is required when {" and ".join(condition_names)} are booked together. Please add {target_res.name} to continue.'})

        all_available, details = _availability_for_resources(prop, [res.id for res in resources], start_dt, end_dt)
        if not all_available:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'availability': details})

        pricing = _calculate_booking_price(resources, start_dt, end_dt, serializer.validated_data.get('extra_charges', 0), prop.tax_percentage, prop.security_deposit)
        
        payment_ref = serializer.validated_data.get('payment_reference')
        payment_screen = serializer.validated_data.get('payment_screenshot')
        payment_method_val = serializer.validated_data.get('payment_method')
        
        has_payment = bool(payment_ref or payment_screen)
        payment_status_value = 'Under Review' if has_payment else 'Pending'
        
        if prop.approval_required or payment_method_val == 'Cash':
            status_value = 'Pending Approval'
        else:
            status_value = 'Pending Approval' if has_payment else 'Pending Payment'

        if member:
            booking = serializer.save(
                member=member,
                status=status_value,
                payment_status=payment_status_value,
                base_amount=pricing['subtotal'],
                extra_charges=pricing['extra_charges'],
                tax_amount=pricing['tax'],
                deposit_amount=pricing['deposit'],
                total_amount=pricing['grand_total'],
                pricing_breakdown=pricing,
            )
        else:
            booking = serializer.save(
                status=status_value,
                payment_status=payment_status_value,
                base_amount=pricing['subtotal'],
                extra_charges=pricing['extra_charges'],
                tax_amount=pricing['tax'],
                deposit_amount=pricing['deposit'],
                total_amount=pricing['grand_total'],
                pricing_breakdown=pricing,
            )
        admins = User.objects.filter(member_profile__community=prop.community, member_profile__role='community_admin')
        for admin in admins:
            _notify_user(admin, 'Booking Created', f'{booking.booking_number} was created for {prop.name}.', 'booking_created')

    def perform_update(self, serializer):
        instance = self.get_object()
        prop = serializer.validated_data.get('property', instance.property)
        if prop and prop.status != 'Approved':
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'property': 'Only approved properties can be booked.'})
        
        resources = serializer.validated_data.get('resources')
        if resources is not None:
            resources = list(resources)
        else:
            resources = list(instance.resources.all())
            
        if not resources:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'resources': 'Select at least one resource.'})
            
        if any(res.property_id != prop.id or res.status != 'Active' for res in resources):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'resources': 'All selected resources must be active and belong to the selected property.'})

        start_date = serializer.validated_data.get('start_date', instance.start_date)
        end_date = serializer.validated_data.get('end_date', instance.end_date)
        start_time = serializer.validated_data.get('start_time', instance.start_time)
        end_time = serializer.validated_data.get('end_time', instance.end_time)
        
        start_dt, end_dt = _booking_window(start_date, end_date, start_time, end_time)
        if end_dt <= start_dt:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'end_time': 'End time must be after start time.'})

        duration_hours = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
        duration_errors = []
        for res in resources:
            if duration_hours < Decimal(str(res.min_booking_duration_hours)):
                duration_errors.append(f'{res.name}: minimum {res.min_booking_duration_hours} hour(s)')
            if duration_hours > Decimal(str(res.max_booking_duration_hours)):
                duration_errors.append(f'{res.name}: maximum {res.max_booking_duration_hours} hour(s)')
        if duration_errors:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'duration': duration_errors})

        # Validate Dependencies
        selected_ids = {res.id for res in resources}
        for res in resources:
            for dep in res.dependencies.all():
                if dep.requires.id not in selected_ids:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({'resources': f'{res.name} requires {dep.requires.name} to be booked together.'})

        # Availability/Conflict checks (excluding current booking)
        all_available, details = _availability_for_resources(prop, [res.id for res in resources], start_dt, end_dt, exclude_booking_id=instance.id)
        if not all_available:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'availability': details})

        extra_charges = serializer.validated_data.get('extra_charges', instance.extra_charges)
        pricing = _calculate_booking_price(resources, start_dt, end_dt, extra_charges, prop.tax_percentage, prop.security_deposit)
        
        serializer.save(
            base_amount=pricing['subtotal'],
            extra_charges=pricing['extra_charges'],
            tax_amount=pricing['tax'],
            deposit_amount=pricing['deposit'],
            total_amount=pricing['grand_total'],
            pricing_breakdown=pricing,
        )

    @action(detail=True, methods=['post'])
    def approve_booking(self, request, pk=None):
        booking = self.get_object()
        if not self._is_admin_for_booking(booking):
            return Response({'error': 'Only community admins can approve bookings.'}, status=403)
        if booking.status != 'Pending Approval':
            return Response({'error': 'Only pending approval bookings can be approved.'}, status=400)
        booking.status = 'Pending Payment'
        booking.save()
        _notify_user(booking.member.user if booking.member and booking.member.user else None, 'Booking Approved', f'{booking.booking_number} is approved. Please submit payment.', 'booking_approved')
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def reject_booking(self, request, pk=None):
        booking = self.get_object()
        if not self._is_admin_for_booking(booking):
            return Response({'error': 'Only community admins can reject bookings.'}, status=403)
        booking.status = 'Rejected'
        booking.save()
        _notify_user(booking.member.user if booking.member and booking.member.user else None, 'Booking Rejected', f'{booking.booking_number} was rejected.', 'booking_rejected')
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def submit_payment(self, request, pk=None):
        booking = self.get_object()
        member = self._member()
        if booking.member_id != getattr(member, 'id', None):
            return Response({'error': 'You can submit payment only for your booking.'}, status=403)
        if booking.status != 'Pending Payment':
            return Response({'error': 'Payment can be submitted only after booking approval.'}, status=400)
        payment_method = request.data.get('payment_method')
        if payment_method not in ['Cash', 'UPI', 'Bank Transfer']:
            return Response({'payment_method': 'Payment method must be Cash, UPI, or Bank Transfer.'}, status=400)
        payment_reference = str(request.data.get('payment_reference', '')).strip()
        if payment_method != 'Cash' and not payment_reference:
            return Response({'payment_reference': 'Transaction ID is required for UPI and Bank Transfer.'}, status=400)
        booking.payment_method = payment_method
        booking.payment_reference = payment_reference
        if 'payment_screenshot' in request.FILES:
            booking.payment_screenshot = request.FILES['payment_screenshot']
        booking.payment_status = 'Under Review'
        booking.save()
        admins = User.objects.filter(member_profile__community=booking.property.community, member_profile__role='community_admin')
        for admin in admins:
            _notify_user(admin, 'Payment Submitted', f'Payment for {booking.booking_number} is ready for verification.', 'payment_submitted')
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def verify_payment(self, request, pk=None):
        booking = self.get_object()
        if not self._is_admin_for_booking(booking):
            return Response({'error': 'Only community admins can verify payments.'}, status=403)
        booking.payment_status = 'Paid'
        booking.status = 'Confirmed'
        booking.payment_verified_by = request.user
        if not booking.receipt_number:
            booking.receipt_number = f"REC-{booking.booking_number.replace('BK-', '')}"
        booking.save()
        _notify_user(booking.member.user if booking.member and booking.member.user else None, 'Payment Verified', f'Payment for {booking.booking_number} is verified.', 'payment_verified')
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def reject_payment(self, request, pk=None):
        booking = self.get_object()
        if not self._is_admin_for_booking(booking):
            return Response({'error': 'Only community admins can reject payments.'}, status=403)
        booking.payment_status = 'Rejected'
        booking.status = 'Pending Payment'
        booking.save()
        _notify_user(booking.member.user if booking.member and booking.member.user else None, 'Payment Rejected', f'Payment for {booking.booking_number} was rejected. Please submit again.', 'payment_rejected')
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        from django.utils import timezone
        booking.checked_in_at = timezone.now()
        booking.status = 'Checked In'
        booking.save()
        return Response({'status': 'Checked in successfully.'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        booking = self.get_object()
        if not self._is_admin_for_booking(booking):
            return Response({'error': 'Only community admins can complete bookings.'}, status=403)
        booking.status = 'Completed'
        booking.save()
        return Response({'status': 'Event completed.'})

    @action(detail=True, methods=['post'])
    def request_cancellation(self, request, pk=None):
        booking = self.get_object()
        if booking.status in ['Cancelled', 'Completed']:
            return Response({'error': 'Booking cannot be cancelled.'}, status=400)
        
        event_start_dt = timezone.make_aware(datetime.datetime.combine(booking.start_date, booking.start_time))
        now = timezone.now()
        
        hours_before = (event_start_dt - now).total_seconds() / 3600.0
        prop = booking.property
        
        refund_amount = 0.0
        refund_pct = 0.0
        if prop.cancellation_allowed:
            tiers = prop.refund_policy_tiers or []
            matched = False
            for tier in sorted(tiers, key=lambda item: float(item.get('hours', 0)), reverse=True):
                if hours_before >= float(tier.get('hours', 0)):
                    refund_pct = float(tier.get('percentage', 0))
                    matched = True
                    break
            if not matched and hours_before >= prop.cancellation_hours:
                refund_pct = float(prop.refund_percentage)
            refund_amount = float(booking.total_amount) * (refund_pct / 100.0)
            
        booking.status = 'Refund Requested' if refund_amount > 0 else 'Cancelled'
        booking.save()
        
        if refund_amount > 0:
            BookingRefund.objects.create(
                booking=booking,
                amount=refund_amount,
                reason=request.data.get('reason', 'User requested cancellation'),
                refund_percentage=refund_pct,
                status='Requested'
            )
            admins = User.objects.filter(member_profile__community=booking.property.community, member_profile__role='community_admin')
            for admin in admins:
                _notify_user(admin, 'Refund Requested', f'Refund request created for {booking.booking_number}.', 'refund_requested')
        else:
            _notify_user(booking.member.user if booking.member and booking.member.user else None, 'Booking Cancelled', f'{booking.booking_number} was cancelled.', 'booking_cancelled')
            
        return Response({
            'status': 'Refund Requested' if refund_amount > 0 else 'Cancelled',
            'refund_amount': refund_amount,
            'refund_pct': refund_pct
        })

    @action(detail=True, methods=['get'])
    def invoice_pdf(self, request, pk=None):
        booking = self.get_object()
        lines = [
            'We Are Going - Booking Invoice',
            f'Booking Number: {booking.booking_number}',
            f'Invoice Number: {booking.invoice_number}',
            f'Receipt Number: {booking.receipt_number or "Pending"}',
            f'Property: {booking.property.name}',
            f'Member: {booking.member.name if booking.member else booking.guest_name}',
            f'Date: {booking.start_date} to {booking.end_date}',
            f'Time: {booking.start_time} - {booking.end_time}',
            'Resources: ' + ', '.join([res.name for res in booking.resources.all()]),
            f'Subtotal: INR {booking.base_amount}',
            f'Extra Charges: INR {booking.extra_charges}',
            f'Deposit: INR {booking.deposit_amount}',
            f'Tax: INR {booking.tax_amount}',
            f'Total Amount: INR {booking.total_amount}',
        ]
        text = '\\n'.join(lines)
        stream = 'BT /F1 12 Tf 50 780 Td ' + ' T* '.join(f'({line})' for line in lines) + ' ET'
        stream_bytes = stream.encode('latin-1', errors='replace')
        pdf = (
            b'%PDF-1.4\n'
            b'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'
            b'2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'
            b'3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n'
            b'4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n'
            + f'5 0 obj << /Length {len(stream_bytes)} >> stream\n'.encode('ascii')
            + stream_bytes
            + b'\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF'
        )
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{booking.invoice_number or booking.booking_number}.pdf"'
        return response

class BookingInspectionViewSet(viewsets.ModelViewSet):
    serializer_class = BookingInspectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return BookingInspection.objects.all()
        if member and member.role == 'community_admin':
            return BookingInspection.objects.filter(booking__property__community=member.community)
        if member:
            return BookingInspection.objects.filter(booking__member=member)
        return BookingInspection.objects.none()

class BookingRefundViewSet(viewsets.ModelViewSet):
    serializer_class = BookingRefundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return BookingRefund.objects.all()
        if member and member.role == 'community_admin':
            return BookingRefund.objects.filter(booking__property__community=member.community)
        if member:
            return BookingRefund.objects.filter(booking__member=member)
        return BookingRefund.objects.none()

class BookingWaitingListViewSet(viewsets.ModelViewSet):
    serializer_class = BookingWaitingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return BookingWaitingList.objects.all()
        if member and member.role == 'community_admin':
            return BookingWaitingList.objects.filter(property__community=member.community)
        if member:
            return BookingWaitingList.objects.filter(member=member)
        return BookingWaitingList.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if member:
            serializer.save(member=member)
        else:
            serializer.save()

class ResourceLockViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceLockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        member = Member.objects.filter(user=user).first()
        if user.is_superuser or (member and member.role == 'super_admin'):
            return ResourceLock.objects.all()
        if member and member.role == 'community_admin':
            return ResourceLock.objects.filter(resource__property__community=member.community)
        if member:
            return ResourceLock.objects.filter(user=user, resource__property__community=member.community)
        return ResourceLock.objects.none()

    def create(self, request, *args, **kwargs):
        resource_id = request.data.get('resource')
        start_time_str = request.data.get('start_time')
        end_time_str = request.data.get('end_time')
        
        import datetime
        from django.utils import timezone
        
        try:
            start_time = timezone.make_aware(datetime.datetime.strptime(start_time_str, '%Y-%m-%dT%H:%M:%S'))
            end_time = timezone.make_aware(datetime.datetime.strptime(end_time_str, '%Y-%m-%dT%H:%M:%S'))
        except Exception:
            try:
                start_time = timezone.make_aware(datetime.datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S'))
                end_time = timezone.make_aware(datetime.datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S'))
            except Exception:
                try:
                    s_date = datetime.datetime.strptime(start_time_str[:10], '%Y-%m-%d')
                    e_date = datetime.datetime.strptime(end_time_str[:10], '%Y-%m-%d')
                    start_time = timezone.make_aware(datetime.datetime.combine(s_date, datetime.time(9, 0)))
                    end_time = timezone.make_aware(datetime.datetime.combine(e_date, datetime.time(17, 0)))
                except Exception:
                    return Response({'error': 'Invalid date format'}, status=400)
                
        conflicting_locks = ResourceLock.objects.filter(
            resource_id=resource_id,
            expires_at__gt=timezone.now(),
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        if conflicting_locks.exists():
            return Response({'error': 'Resource is temporarily locked by another user.'}, status=400)
            
        expires_at = timezone.now() + datetime.timedelta(minutes=10)
        lock = ResourceLock.objects.create(
            resource_id=resource_id,
            user=request.user,
            start_time=start_time,
            end_time=end_time,
            expires_at=expires_at
        )
        serializer = self.get_serializer(lock)
        return Response(serializer.data, status=201)


class ApplicationActionViewSet(viewsets.ModelViewSet):
    queryset = ApplicationAction.objects.all()
    serializer_class = ApplicationActionSerializer
    permission_classes = [permissions.AllowAny]

class ModuleActionViewSet(viewsets.ModelViewSet):
    queryset = ModuleAction.objects.all()
    serializer_class = ModuleActionSerializer
    permission_classes = [permissions.AllowAny]

class ApplicationModuleAuditLogViewSet(viewsets.ModelViewSet):
    queryset = ApplicationModuleAuditLog.objects.all()
    serializer_class = ApplicationModuleAuditLogSerializer
    permission_classes = [permissions.AllowAny]

class ApplicationModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationModuleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = ApplicationModule.objects.filter(deleted_at__isnull=True)
        category = self.request.query_params.get('category')
        is_active = self.request.query_params.get('is_active')
        is_sidebar = self.request.query_params.get('is_sidebar_module')
        is_archived = self.request.query_params.get('is_archived')
        
        if category:
            qs = qs.filter(category=category)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        if is_sidebar is not None:
            qs = qs.filter(is_sidebar_module=is_sidebar.lower() == 'true')
        if is_archived is not None:
            qs = qs.filter(is_archived=is_archived.lower() == 'true')
        else:
            qs = qs.filter(is_archived=False)
            
        return qs.order_by('sort_order')

    @action(detail=False, methods=['get'], url_path='sidebar')
    def sidebar_modules(self, request):
        from django.core.cache import cache
        user = request.user
        cache_key = f"sidebar_modules_{user.id}" if user.is_authenticated else "sidebar_modules_anon"
        sidebar = cache.get(cache_key)
        if not sidebar:
            qs = ApplicationModule.objects.filter(
                deleted_at__isnull=True,
                is_active=True,
                is_sidebar_module=True,
                is_archived=False
            ).order_by('sort_order')
            
            # Return all active modules to show locked ones dynamically with lock badge
            filtered_qs = list(qs)
                
            serializer = self.get_serializer(filtered_qs, many=True, context={'request': request})
            sidebar = serializer.data
            cache.set(cache_key, sidebar, timeout=3600)
        return Response(sidebar)

    @action(detail=False, methods=['get'], url_path='subscription')
    def subscription_modules(self, request):
        qs = ApplicationModule.objects.filter(
            deleted_at__isnull=True,
            is_active=True,
            supports_subscription=True,
            is_archived=False
        ).order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='permission')
    def permission_modules(self, request):
        qs = ApplicationModule.objects.filter(
            deleted_at__isnull=True,
            is_active=True,
            supports_permissions=True,
            is_archived=False
        ).order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='usage')
    def usage_modules(self, request):
        qs = ApplicationModule.objects.filter(
            deleted_at__isnull=True,
            is_active=True,
            supports_usage_counter=True,
            is_archived=False
        ).order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics_modules(self, request):
        qs = ApplicationModule.objects.filter(
            deleted_at__isnull=True,
            is_active=True,
            supports_analytics=True,
            is_archived=False
        ).order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate_module(self, request, pk=None):
        module = self.get_object()
        old_val = module.is_active
        module.is_active = True
        module.save()
        
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        user = request.user if request.user.is_authenticated else None
        ApplicationModuleAuditLog.objects.create(
            module_code=module.module_code,
            field_name='is_active',
            old_value=str(old_val),
            new_value='True',
            changed_by=user
        )
        return Response({'status': 'activated'})

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate_module(self, request, pk=None):
        module = self.get_object()
        if module.is_system:
            return Response({'error': 'Cannot deactivate system modules'}, status=400)
        old_val = module.is_active
        module.is_active = False
        module.save()
        
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        user = request.user if request.user.is_authenticated else None
        ApplicationModuleAuditLog.objects.create(
            module_code=module.module_code,
            field_name='is_active',
            old_value=str(old_val),
            new_value='False',
            changed_by=user
        )
        return Response({'status': 'deactivated'})

    @action(detail=True, methods=['post'], url_path='archive')
    def archive_module(self, request, pk=None):
        module = self.get_object()
        if module.is_system:
            return Response({'error': 'Cannot archive system modules'}, status=400)
        old_val = module.is_archived
        module.is_archived = True
        module.is_active = False
        module.save()
        
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        user = request.user if request.user.is_authenticated else None
        ApplicationModuleAuditLog.objects.create(
            module_code=module.module_code,
            field_name='is_archived',
            old_value=str(old_val),
            new_value='True',
            changed_by=user
        )
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'], url_path='clone')
    def clone_module(self, request, pk=None):
        module = self.get_object()
        
        from django.db.models import Max
        max_sort = ApplicationModule.objects.filter(deleted_at__isnull=True).aggregate(Max('sort_order'))['sort_order__max'] or 0
        
        cloned = ApplicationModule.objects.create(
            module_code=f"{module.module_code}_clone_{random.randint(100, 999)}",
            display_name=f"{module.display_name} (Copy)",
            description=module.description,
            category=module.category,
            icon=module.icon,
            route=f"{module.route}-copy-{random.randint(100, 999)}" if module.route else None,
            parent_module=module.parent_module,
            sort_order=max_sort + 1,
            is_sidebar_module=module.is_sidebar_module,
            is_visible=module.is_visible,
            is_active=True,
            is_system=False,
            supports_subscription=module.supports_subscription,
            supports_permissions=module.supports_permissions,
            supports_usage_counter=module.supports_usage_counter,
            supports_analytics=module.supports_analytics,
            supports_audit_logs=module.supports_audit_logs,
            supports_notifications=module.supports_notifications,
            supports_export=module.supports_export,
            supports_import=module.supports_import,
            supports_search=module.supports_search,
            supports_api=module.supports_api,
            supports_mobile=module.supports_mobile,
            supports_dashboard_widgets=module.supports_dashboard_widgets,
            supports_reports=module.supports_reports,
            supports_approval_workflow=module.supports_approval_workflow
        )
        
        for ma in module.module_actions.all():
            ModuleAction.objects.create(module=cloned, action=ma.action, is_custom=ma.is_custom, description=ma.description)
            
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        serializer = self.get_serializer(cloned)
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['post'], url_path='bulk-activate')
    def bulk_activate(self, request):
        ids = request.data.get('ids', [])
        modules = ApplicationModule.objects.filter(pk__in=ids, deleted_at__isnull=True)
        for m in modules:
            m.is_active = True
            m.save()
            
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        return Response({'status': 'bulk activated'})

    @action(detail=False, methods=['post'], url_path='bulk-deactivate')
    def bulk_deactivate(self, request):
        ids = request.data.get('ids', [])
        modules = ApplicationModule.objects.filter(pk__in=ids, deleted_at__isnull=True, is_system=False)
        for m in modules:
            m.is_active = False
            m.save()
            
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        return Response({'status': 'bulk deactivated'})

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        updates = request.data.get('updates', [])
        from django.core.cache import cache
        for up in updates:
            try:
                module = ApplicationModule.objects.get(pk=up.get('id'), deleted_at__isnull=True)
                field = up.get('field')
                val = up.get('value')
                if module.is_system and field in ('is_active', 'is_archived', 'deleted_at') and not val:
                    continue
                if hasattr(module, field):
                    setattr(module, field, val)
                    module.save()
            except ApplicationModule.DoesNotExist:
                continue
        cache.delete('sidebar_modules')
        return Response({'status': 'bulk updated'})

    @action(detail=False, methods=['post'], url_path='scan')
    def scan_and_discover(self, request):
        created_count = 0
        
        ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT", "EXPORT", "APPROVE", "REJECT", "ASSIGN", "DOWNLOAD", "UPLOAD", "ARCHIVE", "RESTORE", "MANAGE"]
        for act_name in ACTIONS:
            ApplicationAction.objects.get_or_create(name=act_name)
            
        default_actions = ApplicationAction.objects.filter(name__in=["VIEW", "CREATE", "EDIT", "DELETE"])
        
        DEFAULT_MODULES = [
            {
                "module_code": "dashboard",
                "display_name": "Dashboard",
                "category": "Core",
                "icon": "LayoutDashboard",
                "route": "/dashboard",
                "is_sidebar_module": True,
                "supports_analytics": True,
                "is_system": True
            },
            {
                "module_code": "members",
                "display_name": "Members",
                "category": "Community",
                "icon": "Users",
                "route": "/dashboard/directory",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "family",
                "display_name": "Family",
                "category": "Community",
                "icon": "UsersRound",
                "route": "/dashboard/family",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "committee",
                "display_name": "Committee",
                "category": "Community",
                "icon": "UserCog",
                "route": "/dashboard/committee",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "hierarchy",
                "display_name": "Hierarchy",
                "category": "Community",
                "icon": "Network",
                "route": "/dashboard/hierarchy",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "events",
                "display_name": "Events",
                "category": "Events",
                "icon": "Calendar",
                "route": "/dashboard/events",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "jobs",
                "display_name": "Jobs",
                "category": "Directory",
                "icon": "Briefcase",
                "route": "/dashboard/jobs",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "business",
                "display_name": "Business Directory",
                "category": "Directory",
                "icon": "Building2",
                "route": "/dashboard/business",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "donations",
                "display_name": "Donations",
                "category": "Finance",
                "icon": "HandHeart",
                "route": "/dashboard/donations",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True,
                "supports_analytics": True
            },
            {
                "module_code": "venues",
                "display_name": "Venues",
                "category": "Property",
                "icon": "MapPin",
                "route": "/dashboard/venues",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "gallery",
                "display_name": "Gallery",
                "category": "Gallery",
                "icon": "Image",
                "route": "/community-admin/gallery",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "matrimony",
                "display_name": "Matrimony",
                "category": "Matrimony",
                "icon": "Heart",
                "route": "/dashboard/matrimony",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "messages",
                "display_name": "Messages",
                "category": "Communication",
                "icon": "MessageSquare",
                "route": "/dashboard/messages",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "notifications",
                "display_name": "Notifications",
                "category": "Communication",
                "icon": "Bell",
                "route": "/dashboard/notifications",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True
            },
            {
                "module_code": "settings",
                "display_name": "Settings",
                "category": "Administration",
                "icon": "Settings",
                "route": "/dashboard/settings",
                "is_sidebar_module": True,
                "is_system": True
            },
            {
                "module_code": "plans",
                "display_name": "Plans",
                "category": "Subscription",
                "icon": "CreditCard",
                "route": "/community-admin/plan",
                "is_sidebar_module": True,
                "is_system": True
            },
            {
                "module_code": "subscriptions",
                "display_name": "Subscription",
                "category": "Subscription",
                "icon": "CreditCard",
                "route": "/admin/subscriptions",
                "is_sidebar_module": True,
                "is_system": True
            },
            {
                "module_code": "attendance",
                "display_name": "Attendance",
                "category": "Attendance",
                "icon": "CalendarCheck",
                "route": "/dashboard/attendance",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            },
            {
                "module_code": "properties",
                "display_name": "Property Booking",
                "category": "Property",
                "icon": "MapPin",
                "route": "/dashboard/properties",
                "is_sidebar_module": True,
                "supports_subscription": True,
                "supports_permissions": True,
                "supports_usage_counter": True
            }
        ]

        for df in DEFAULT_MODULES:
            module, created = ApplicationModule.objects.get_or_create(
                module_code=df["module_code"],
                defaults={
                    "display_name": df["display_name"],
                    "category": df["category"],
                    "icon": df["icon"],
                    "route": df.get("route"),
                    "sort_order": DEFAULT_MODULES.index(df) + 1,
                    "is_sidebar_module": df.get("is_sidebar_module", False),
                    "is_system": df.get("is_system", False),
                    "supports_subscription": df.get("supports_subscription", False),
                    "supports_permissions": df.get("supports_permissions", False),
                    "supports_usage_counter": df.get("supports_usage_counter", False),
                    "supports_analytics": df.get("supports_analytics", False)
                }
            )
            if created:
                created_count += 1
                for action in default_actions:
                    ModuleAction.objects.get_or_create(module=module, action=action)
        
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        routes_dir = os.path.join(base_dir, 'src', 'routes')
        discovered = set()
        
        if os.path.exists(routes_dir):
            import re
            for filename in os.listdir(routes_dir):
                if filename.endswith('.tsx'):
                    match = re.match(r'^(admin|community-admin|dashboard)\.([^.]+)\.tsx$', filename)
                    if match:
                        code = match.group(2)
                        if code not in ('index', 'tsx', 'venues', 'communities', 'members', 'committee', 'events', 'jobs', 'donations', 'matrimony', 'settings', 'reports', 'roles', 'subscriptions'):
                            discovered.add(code)
                            
        existing_routes = set(ApplicationModule.objects.filter(deleted_at__isnull=True).values_list('route', flat=True))
        existing_routes.discard(None)
        
        for code in discovered:
            if not ApplicationModule.objects.filter(module_code=code, deleted_at__isnull=True).exists():
                route = f"/dashboard/{code}"
                if route in existing_routes:
                    route = f"/dashboard/custom-{code}"
                    if route in existing_routes:
                        continue
                
                from django.db.models import Max
                max_sort = ApplicationModule.objects.filter(deleted_at__isnull=True).aggregate(Max('sort_order'))['sort_order__max'] or 0
                module = ApplicationModule.objects.create(
                    module_code=code,
                    display_name=code.replace('-', ' ').title(),
                    category="Custom",
                    icon="Box",
                    route=route,
                    sort_order=max_sort + 1,
                    is_sidebar_module=True,
                    is_active=True,
                    supports_subscription=True,
                    supports_permissions=True,
                    supports_usage_counter=True
                )
                existing_routes.add(route)
                created_count += 1
                for action in default_actions:
                    ModuleAction.objects.get_or_create(module=module, action=action)
                    
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        return Response({'status': 'scan completed', 'created_modules': created_count})

    def destroy(self, request, *args, **kwargs):
        module = self.get_object()
        if module.is_system:
            return Response({'error': 'Cannot delete system modules'}, status=400)
        
        import datetime
        module.deleted_at = datetime.datetime.now()
        module.is_active = False
        module.save()
        
        FeatureMaster.objects.filter(code=module.module_code).update(active=False)
        
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        return Response({'status': 'deleted'}, status=204)

    def perform_create(self, serializer):
        instance = serializer.save()
        
        ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE"]
        default_actions = ApplicationAction.objects.filter(name__in=ACTIONS)
        for act in default_actions:
            ModuleAction.objects.get_or_create(module=instance, action=act)
            
        from django.core.cache import cache
        cache.delete('sidebar_modules')

    def perform_update(self, serializer):
        instance = self.get_object()
        old_data = {field: getattr(instance, field) for field in serializer.validated_data}
        updated_instance = serializer.save()
        
        from django.core.cache import cache
        cache.delete('sidebar_modules')
        
        user = self.request.user if self.request.user.is_authenticated else None
        for field, new_val in serializer.validated_data.items():
            old_val = old_data.get(field)
            if old_val != new_val:
                ApplicationModuleAuditLog.objects.create(
                    module_code=updated_instance.module_code,
                    field_name=field,
                    old_value=str(old_val),
                    new_value=str(new_val),
                    changed_by=user
                )


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: MEMBER PREMIUM SUBSCRIPTION VIEWSETS
# ─────────────────────────────────────────────────────────────────────────────
from .models import (
    PremiumFeatureRegistry,
    MemberPremiumPlan, MemberPremiumFeature, MemberPremiumBenefit,
    MemberPremiumAddon, MemberPremiumCoupon, MemberPremiumSubscription,
    MemberFeatureUsage, MemberPremiumTransaction, MemberPremiumInvoice,
    MemberAddonPurchase, MemberPremiumAuditLog,
    CommunityLicense, CommunityModuleAccess, CommunityUsage, CommunityBilling,
    CommunityInvoice, CommunityTransaction, CommunityAddon, CommunityAuditLog,
    MemberPremiumReward, MemberPremiumSupportTicket
)
from .serializers import (
    PremiumFeatureRegistrySerializer,
    MemberPremiumPlanSerializer, MemberPremiumFeatureSerializer, MemberPremiumBenefitSerializer,
    MemberPremiumAddonSerializer, MemberPremiumCouponSerializer,
    MemberPremiumSubscriptionSerializer, MemberFeatureUsageSerializer,
    MemberPremiumTransactionSerializer, MemberPremiumInvoiceSerializer,
    MemberAddonPurchaseSerializer, MemberPremiumAuditLogSerializer,
    CommunityLicenseSerializer, CommunityModuleAccessSerializer, CommunityUsageSerializer,
    CommunityBillingSerializer, CommunityInvoiceSerializer, CommunityTransactionSerializer,
    CommunityAddonSerializer, CommunityAuditLogSerializer,
    MemberPremiumRewardSerializer, MemberPremiumSupportTicketSerializer
)

DEFAULT_REGISTRY_FEATURES = [
    # Matrimony
    ("matrimony", "Matrimony Access", "MATRIMONY_ACCESS", "Access to premium matrimony and matchmaking features", "matrimony", "heart"),

    # Committee
    ("committee", "Committee Access", "COMMITTEE_ACCESS", "Access to community committee board and decisions", "committee", "users"),

    # Events
    ("events", "Events Access", "EVENTS_ACCESS", "Access to community events and registrations", "events", "calendar"),

    # Donations
    ("donations", "Donations Access", "DONATIONS_ACCESS", "Access to participate in campaigns and donations", "donations", "hand-heart"),

    # Venues
    ("venues", "Venues Access", "VENUES_ACCESS", "Access to view community halls, grounds, and venues", "venues", "map-pin"),

    # Messaging (Messages)
    ("messaging", "Messages Access", "MESSAGES_ACCESS", "Access to direct chat messaging and discussions", "messaging", "message-square"),

    # Attendance
    ("attendance", "Attendance Access", "ATTENDANCE_ACCESS", "Access to mark and track attendance", "attendance", "calendar-check"),

    # Property Booking
    ("property", "Property Booking Access", "PROPERTY_BOOKING_ACCESS", "Access to reserve properties and community halls", "property", "box"),

    # Subsidiaries
    ("subsidiaries", "Subsidiaries Access", "SUBSIDIARIES_ACCESS", "Access to view and connect with subsidiary boards", "subsidiaries", "building-2"),

    # Advertisements
    ("ads", "Advertisements Access", "ADVERTISEMENTS_ACCESS", "Access to publish and manage advertisements", "ads", "megaphone"),
]


class PremiumFeatureRegistryViewSet(viewsets.ModelViewSet):
    queryset = PremiumFeatureRegistry.objects.all()
    serializer_class = PremiumFeatureRegistrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Auto seed missing default features
        for module, name, code, desc, cat, icon in DEFAULT_REGISTRY_FEATURES:
            PremiumFeatureRegistry.objects.get_or_create(
                feature_code=code,
                defaults={
                    'module': module,
                    'feature_name': name,
                    'description': desc,
                    'category': cat,
                    'icon': icon,
                    'status': 'active'
                }
            )
        # Delete registry entries that are no longer in DEFAULT_REGISTRY_FEATURES
        valid_codes = [f[2] for f in DEFAULT_REGISTRY_FEATURES]
        PremiumFeatureRegistry.objects.exclude(feature_code__in=valid_codes).delete()
        return PremiumFeatureRegistry.objects.all()


class MemberPremiumPlanViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumPlan.objects.filter(is_archived=False).order_by('display_order', 'id')
    serializer_class = MemberPremiumPlanSerializer
    permission_classes = [permissions.AllowAny]

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        # Soft delete the plan instead of hard delete to prevent re-seeding of free/standard plans
        plan.is_archived = True
        if plan.code and plan.code not in ['free', 'silver', 'gold']:
            import time
            plan.code = f"{plan.code}_deleted_{int(time.time())}"
        plan.save()
        
        # Find all active subscriptions for this plan to create audit log records
        active_subs = MemberPremiumSubscription.objects.filter(plan=plan)
        user = request.user if request.user.is_authenticated else None
        
        for sub in active_subs:
            MemberPremiumAuditLog.objects.create(
                action='subscription_cancelled',
                member=sub.member,
                subscription=sub,
                plan=plan,
                description=f"Subscription deactivated due to plan '{plan.name}' being deleted by administrator.",
                performed_by=user
            )
            
        # Set referencing member subscriptions to None and status to inactive so they are unsubscribed
        active_subs.update(plan=None, status='inactive')
        return Response(status=status.HTTP_204_NO_CONTENT)


    @action(detail=True, methods=['post'], url_path='clone')
    def clone_plan(self, request, pk=None):
        plan = self.get_object()
        import time
        new_code = f"{plan.code}_clone_{int(time.time())}"
        new_plan = MemberPremiumPlan.objects.create(
            name=f"{plan.name} (Copy)",
            code=new_code,
            plan_type=plan.plan_type,
            short_description=plan.short_description,
            description=plan.description,
            color_theme=plan.color_theme,
            icon=plan.icon,
            monthly_price=plan.monthly_price,
            quarterly_price=plan.quarterly_price,
            half_yearly_price=plan.half_yearly_price,
            yearly_price=plan.yearly_price,
            lifetime_price=plan.lifetime_price,
            currency=plan.currency,
            gst_percentage=plan.gst_percentage,
            discount_percentage=plan.discount_percentage,
            trial_days=plan.trial_days,
            grace_period_days=plan.grace_period_days,
            status='inactive',
            display_order=plan.display_order + 1,
            metadata=plan.metadata,
        )
        # Clone features
        for feat in plan.features.all():
            MemberPremiumFeature.objects.create(
                plan=new_plan,
                feature_code=feat.feature_code,
                name=feat.name,
                description=feat.description,
                category=feat.category,
                icon=feat.icon,
                is_enabled=feat.is_enabled,
                is_unlimited=feat.is_unlimited,
                limit_type=feat.limit_type,
                limit_value=feat.limit_value,
                priority=feat.priority,
                upgrade_message=feat.upgrade_message,
            )
        # Clone benefits
        for ben in plan.benefits.all():
            MemberPremiumBenefit.objects.create(
                plan=new_plan,
                title=ben.title,
                description=ben.description,
                icon=ben.icon,
                is_highlight=ben.is_highlight,
                display_order=ben.display_order,
                is_included=ben.is_included,
            )
        serializer = MemberPremiumPlanSerializer(new_plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive_plan(self, request, pk=None):
        plan = self.get_object()
        plan.is_archived = True
        plan.status = 'archived'
        plan.save()
        return Response({"detail": "Plan archived successfully."})

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        from django.db.models import Sum, Count
        total_premium = MemberPremiumSubscription.objects.filter(status='active').count()
        total_trial = MemberPremiumSubscription.objects.filter(status='trial').count()
        total_expired = MemberPremiumSubscription.objects.filter(status='expired').count()
        total_cancelled = MemberPremiumSubscription.objects.filter(status='cancelled').count()
        monthly_revenue = MemberPremiumTransaction.objects.filter(
            transaction_status='success',
            transaction_type__in=['purchase', 'renewal', 'upgrade']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        plan_distribution = []
        for plan in MemberPremiumPlan.objects.all():
            count = MemberPremiumSubscription.objects.filter(plan=plan, status='active').count()
            plan_distribution.append({
                'plan': plan.name,
                'code': plan.code,
                'color': plan.color_theme,
                'count': count,
            })

        return Response({
            'total_premium_members': total_premium,
            'total_trial': total_trial,
            'total_expired': total_expired,
            'total_cancelled': total_cancelled,
            'monthly_revenue': float(monthly_revenue),
            'plan_distribution': plan_distribution,
        })


class MemberPremiumFeatureViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumFeature.objects.all()
    serializer_class = MemberPremiumFeatureSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs


class MemberPremiumBenefitViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumBenefit.objects.all()
    serializer_class = MemberPremiumBenefitSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs


class MemberPremiumAddonViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumAddon.objects.all()
    serializer_class = MemberPremiumAddonSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], url_path='purchase')
    def purchase(self, request, pk=None):
        addon = self.get_object()
        quantity = int(request.data.get('quantity', 1))
        
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=401)
        try:
            member = user.member_profile
        except Exception:
            return Response({"detail": "Member profile not found"}, status=400)
            
        sub = MemberPremiumSubscription.objects.filter(member=member).order_by('-created_at').first()
        if not sub:
            free_plan, _ = MemberPremiumPlan.objects.get_or_create(
                code='free',
                defaults={
                    'name': 'Free Membership',
                    'plan_type': 'free',
                    'monthly_price': 0,
                    'yearly_price': 0,
                    'status': 'active',
                    'short_description': 'Basic free plan.'
                }
            )
            from django.utils import timezone
            sub = MemberPremiumSubscription.objects.create(
                member=member,
                plan=free_plan,
                status='active',
                billing_cycle='lifetime',
                start_date=timezone.now()
            )
            
        price = Decimal(str(addon.price)) * quantity
        gst_amount = price * Decimal('0.18')
        total_amount = price + gst_amount
        
        purchase = MemberAddonPurchase.objects.create(
            member=member,
            addon=addon,
            quantity=quantity,
            amount_paid=total_amount,
            status='active'
        )
        
        import random
        txn = MemberPremiumTransaction.objects.create(
            subscription=sub,
            transaction_type='addon',
            transaction_status='success',
            amount=price,
            gst_amount=gst_amount,
            total_amount=total_amount,
            payment_method=request.data.get('payment_method', 'Razorpay'),
            transaction_ref=f"TXN-ADD-{random.randint(100000, 999999)}",
            plan=sub.plan,
            notes=f"Purchased addon: {addon.name} x {quantity}"
        )
        
        import time
        import random
        random_suffix = random.randint(1000, 9999)
        invoice_no = f"INV-ADD-{int(time.time())}-{random_suffix}"
        MemberPremiumInvoice.objects.create(
            transaction=txn,
            invoice_no=invoice_no,
            gst_invoice_no=f"GST-ADD-{int(time.time())}-{random_suffix}",
            subtotal=price,
            gst_percentage=18,
            gst_amount=gst_amount,
            total=total_amount,
            paid=True,
            notes=f"Purchase of addon {addon.name}."
        )
        
        MemberPremiumAuditLog.objects.create(
            action='addon_purchased',
            member=member,
            subscription=sub,
            plan=sub.plan,
            description=f"Purchased addon: {addon.name} (Qty: {quantity})",
            performed_by=user,
        )
        return Response(MemberAddonPurchaseSerializer(purchase).data)


class MemberPremiumCouponViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumCoupon.objects.all().order_by('-created_at')
    serializer_class = MemberPremiumCouponSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='validate')
    def validate_coupon(self, request):
        code = request.data.get('code', '').strip().upper()
        plan_id = request.data.get('plan_id')
        amount = float(request.data.get('amount', 0))
        try:
            coupon = MemberPremiumCoupon.objects.get(code=code, is_active=True)
        except MemberPremiumCoupon.DoesNotExist:
            return Response({"valid": False, "error": "Invalid or inactive coupon code."}, status=400)

        from django.utils import timezone
        if coupon.expiry_date and coupon.expiry_date < timezone.now():
            return Response({"valid": False, "error": "This coupon has expired."}, status=400)
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return Response({"valid": False, "error": "This coupon has reached its usage limit."}, status=400)
        if amount < float(coupon.minimum_amount):
            return Response({"valid": False, "error": f"Minimum order amount is ₹{coupon.minimum_amount}."}, status=400)

        discount = 0
        if coupon.coupon_type == 'percentage':
            discount = (amount * float(coupon.discount_value)) / 100
            if coupon.max_discount_amount:
                discount = min(discount, float(coupon.max_discount_amount))
        elif coupon.coupon_type == 'flat':
            discount = float(coupon.discount_value)

        return Response({
            "valid": True,
            "coupon": MemberPremiumCouponSerializer(coupon).data,
            "discount_amount": round(discount, 2),
            "final_amount": round(amount - discount, 2),
        })


def ensure_features_for_member_plan(plan):
    if not plan:
        return
        
    from api.models import MemberPremiumFeature, MemberPremiumBenefit
    
    # Check if the plan contains any old features or features are empty but benefits exist
    has_old_features = plan.features.filter(
        feature_code__in=[
            'UNLIMITED_CHAT', 'MATRIMONY_INTERESTS', 'MATRIMONY_UNLIMITED_VIEWS', 
            'BUSINESS_PROMOTIONS', 'JOBS_UNLIMITED_APPLY', 'EVENTS_UNLIMITED', 
            'AI_CREDITS', 'STORAGE_GB', 'VENUE_BOOKING_ENABLED', 'DONATIONS_ENABLED', 
            'BUSINESS_ADS'
        ]
    ).exists() or plan.features.filter(feature_code__startswith='MSG_').exists()
    
    if has_old_features or (not plan.features.exists() and plan.benefits.exists()):
        plan.features.all().delete()
        plan.benefits.all().delete()
        
    # Auto-repair logic: if a non-free plan has features but none of them are enabled,
    # it is in a corrupted state (due to frontend serialization bugs), so we reset the features.
    if plan.plan_type != 'free' and plan.features.exists() and not plan.features.filter(is_enabled=True).exists():
        plan.features.all().delete()
        
    features = [
        ("MATRIMONY_ACCESS", "Matrimony Access", "Access to premium matrimony search and matchmaking", "matrimony"),
        ("COMMITTEE_ACCESS", "Committee Access", "Access to community committee board and decisions", "committee"),
        ("EVENTS_ACCESS", "Events Access", "Access to premium events registration and updates", "events"),
        ("DONATIONS_ACCESS", "Donations Access", "Access to contribute to donation campaigns", "donations"),
        ("VENUES_ACCESS", "Venues Access", "Access to book and view community venues", "venues"),
        ("MESSAGES_ACCESS", "Messages Access", "Access to direct and group messaging features", "messaging"),
        ("ATTENDANCE_ACCESS", "Attendance Access", "Access to mark and view attendance logs", "attendance"),
        ("PROPERTY_BOOKING_ACCESS", "Property Booking Access", "Access to request property bookings", "property"),
        ("SUBSIDIARIES_ACCESS", "Subsidiaries Access", "Access to view subsidiary organizations", "subsidiaries"),
        ("ADVERTISEMENTS_ACCESS", "Advertisements Access", "Access to request advertisement bookings", "ads"),
    ]
    
    code_lower = (plan.code or "").lower()
    has_features = plan.features.exists()
    for code, name, desc, cat in features:
        feature_exists = plan.features.filter(feature_code=code).exists()
        if not feature_exists:
            is_enabled = False
            if not has_features:
                if 'free' in code_lower:
                    is_enabled = False
                elif 'silver' in code_lower:
                    # Silver has messaging, events, donations
                    is_enabled = code in ['MESSAGES_ACCESS', 'EVENTS_ACCESS', 'DONATIONS_ACCESS']
                elif 'gold' in code_lower:
                    # Gold has messaging, events, donations, venues, matrimony, committee
                    is_enabled = code in ['MESSAGES_ACCESS', 'EVENTS_ACCESS', 'DONATIONS_ACCESS', 'VENUES_ACCESS', 'MATRIMONY_ACCESS', 'COMMITTEE_ACCESS']
                else:
                    is_enabled = True
            else:
                is_enabled = False

                
            MemberPremiumFeature.objects.create(
                plan=plan,
                feature_code=code,
                name=name,
                description=desc,
                category=cat,
                limit_type='unlimited',
                limit_value=0,
                is_enabled=is_enabled,
                upgrade_message=f"Upgrade your plan to unlock {name}."
            )

    benefits = [
        ("Premium Matrimony Search", "Express interest without limit", "heart", True, 'MATRIMONY_ACCESS'),
        ("Committee Board Access", "Access community decisions", "users", True, 'COMMITTEE_ACCESS'),
        ("Priority Event Registrations", "Access premium events", "calendar", True, 'EVENTS_ACCESS'),
        ("Donation Campaign Access", "Contribute to fundraisers", "hand-heart", True, 'DONATIONS_ACCESS'),
        ("Venue Booking Privileges", "Rent community halls & grounds", "map-pin", True, 'VENUES_ACCESS'),
        ("Unlimited Direct Messaging", "Connect with anyone instantly", "message-circle", True, 'MESSAGES_ACCESS'),
        ("Attendance Tracking Tools", "Mark & view attendance logs", "calendar-check", True, 'ATTENDANCE_ACCESS'),
        ("Property Booking Access", "Request bookings of properties", "box", True, 'PROPERTY_BOOKING_ACCESS'),
        ("Subsidiaries Registry View", "Browse subsidiary boards", "building-2", True, 'SUBSIDIARIES_ACCESS'),
        ("Business Ads Booking", "Manage and publish ads", "megaphone", True, 'ADVERTISEMENTS_ACCESS'),
    ]
    
    for title, desc, icon, highlight, fcode in benefits:
        feature_enabled = plan.features.filter(feature_code=fcode, is_enabled=True).exists()
        benefit_obj, created = MemberPremiumBenefit.objects.get_or_create(
            plan=plan,
            title=title,
            defaults={
                'description': desc,
                'icon': icon,
                'is_highlight': highlight,
                'is_included': feature_enabled
            }
        )
        if not created and benefit_obj.is_included != feature_enabled:
            benefit_obj.is_included = feature_enabled
            benefit_obj.save()


def check_member_feature_limit(member, feature_code, increment=False):
    """
    Checks if a member has access to a premium feature, and optionally increments usage.
    Returns: (has_access, message_or_reason)
    """
    from api.models import MemberPremiumSubscription, MemberPremiumFeature, MemberFeatureUsage, MemberPremiumPlan
    
    # Map old/legacy feature codes to the new registry-driven features
    feature_mapping = {
        "UNLIMITED_CHAT": "MESSAGES_ACCESS",
        "MATRIMONY_INTERESTS": "MATRIMONY_ACCESS",
        "MATRIMONY_UNLIMITED_VIEWS": "MATRIMONY_ACCESS",
        "EVENTS_UNLIMITED": "EVENTS_ACCESS",
        "VENUE_BOOKING_ENABLED": "VENUES_ACCESS",
        "DONATIONS_ENABLED": "DONATIONS_ACCESS",
        "BUSINESS_ADS": "ADVERTISEMENTS_ACCESS",
    }
    
    always_allowed = {"JOBS_UNLIMITED_APPLY", "BUSINESS_PROMOTIONS", "STORAGE_GB", "AI_CREDITS"}
    if feature_code in always_allowed:
        return True, "Success"
        
    mapped_code = feature_mapping.get(feature_code, feature_code)
    
    # 1. Get active premium subscription or fall back to free plan
    sub = None
    if member:
        sub = MemberPremiumSubscription.objects.filter(member=member).order_by('-created_at').first()
        
    plan = None
    if sub and sub.is_currently_active() and sub.plan:
        plan = sub.plan
    else:
        # Check if a free plan subscription exists, otherwise create one
        from django.utils import timezone
        free_plan, _ = MemberPremiumPlan.objects.get_or_create(
            code='free',
            defaults={
                'name': 'Free Membership',
                'plan_type': 'free',
                'monthly_price': 0,
                'yearly_price': 0,
                'status': 'active',
                'short_description': 'Basic free plan.'
            }
        )
        
        # Ensure default features are seeded for the plan
        ensure_features_for_member_plan(free_plan)
        
        if member:
            sub, _ = MemberPremiumSubscription.objects.get_or_create(
                member=member,
                plan=free_plan,
                defaults={
                    'status': 'active',
                    'billing_cycle': 'lifetime',
                    'start_date': timezone.now()
                }
            )
            plan = sub.plan
        else:
            plan = free_plan
            
    if not plan:
        return True, "No active membership plan"
        
    # Ensure default features are seeded for the plan if they are missing
    ensure_features_for_member_plan(plan)
    
    # 2. Retrieve feature using the mapped code
    feature = MemberPremiumFeature.objects.filter(plan=plan, feature_code=mapped_code).first()
    if not feature:
        # Check if mapped_code is in the registry.
        from api.models import PremiumFeatureRegistry
        if PremiumFeatureRegistry.objects.filter(feature_code=mapped_code).exists():
            return False, f"Feature not included in your current plan. Please upgrade."
        return True, "Success"
        
    if not feature.is_enabled:
        return False, feature.upgrade_message or f"Feature {feature.name} is disabled. Upgrade your plan."
        
    if feature.is_unlimited or feature.limit_type == 'unlimited':
        return True, "Success"
        
    # Check limit value
    if feature.limit_value > 0:
        if not sub:
            return True, "Success"
        usage, _ = MemberFeatureUsage.objects.get_or_create(subscription=sub, feature_code=mapped_code)
        if usage.used_count >= feature.limit_value:
            return False, feature.upgrade_message or f"Usage limit reached ({usage.used_count}/{feature.limit_value}). Please upgrade your plan."
        if increment:
            usage.used_count += 1
            usage.save()
            
    return True, "Success"


class MemberPremiumSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumSubscription.objects.select_related('member', 'plan', 'coupon').order_by('-created_at')
    serializer_class = MemberPremiumSubscriptionSerializer
    permission_classes = [permissions.AllowAny]

    def _clear_sidebar_cache(self, user):
        if user and user.is_authenticated:
            from django.core.cache import cache
            cache.delete(f"sidebar_modules_{user.id}")

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.member and instance.member.user:
            self._clear_sidebar_cache(instance.member.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.member and instance.member.user:
            self._clear_sidebar_cache(instance.member.user)

    def perform_destroy(self, instance):
        user = instance.member.user if (instance.member and instance.member.user) else None
        instance.delete()
        if user:
            self._clear_sidebar_cache(user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            try:
                member = user.member_profile
                qs = qs.filter(member=member)
            except Exception:
                return qs.none()
        status_filter = self.request.query_params.get('status')
        plan_id = self.request.query_params.get('plan')
        member_id = self.request.query_params.get('member')
        search = self.request.query_params.get('search', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        if member_id:
            qs = qs.filter(member_id=member_id)
        if search:
            qs = qs.filter(Q(member__name__icontains=search) | Q(member__email__icontains=search))
        return qs

    @action(detail=False, methods=['get'], url_path='my-membership')
    def my_membership(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=401)
        try:
            member = user.member_profile
        except Exception:
            return Response({"detail": "Member profile not found"}, status=400)
            
        sub = MemberPremiumSubscription.objects.filter(member=member).order_by('-created_at').first()
        if not sub:
            free_plan, _ = MemberPremiumPlan.objects.get_or_create(
                code='free',
                defaults={
                    'name': 'Free Membership',
                    'plan_type': 'free',
                    'monthly_price': 0,
                    'yearly_price': 0,
                    'status': 'active',
                    'short_description': 'Basic free plan.'
                }
            )
            from django.utils import timezone
            sub = MemberPremiumSubscription.objects.create(
                member=member,
                plan=free_plan,
                status='active',
                billing_cycle='lifetime',
                start_date=timezone.now()
            )
            
        self._ensure_features_for_plan(sub.plan)
        
        data = MemberPremiumSubscriptionSerializer(sub, context={'request': request}).data
        
        days_remaining = 0
        if sub.end_date:
            from django.utils import timezone
            delta = sub.end_date - timezone.now()
            days_remaining = max(0, delta.days)
            
        data['days_remaining'] = days_remaining
        data['verified_badge'] = getattr(member, 'is_verified', False) or (sub.plan and sub.plan.plan_type != 'free' and sub.plan.code != 'free')
        
        reward, _ = MemberPremiumReward.objects.get_or_create(member=member)
        data['rewards'] = MemberPremiumRewardSerializer(reward).data
        
        tickets = MemberPremiumSupportTicket.objects.filter(member=member).order_by('-created_at')
        data['tickets'] = MemberPremiumSupportTicketSerializer(tickets, many=True).data
        
        # Include list of all active plans for comparison
        all_plans = MemberPremiumPlan.objects.filter(is_archived=False).order_by('display_order', 'id')
        for p in all_plans:
            self._ensure_features_for_plan(p)
        data['all_plans'] = MemberPremiumPlanSerializer(all_plans, many=True, context={'request': request}).data
        
        # 1. Dynamic Features and Usages
        from api.models import MemberPremiumFeature, MemberFeatureUsage
        usages = []
        features_list = MemberPremiumFeature.objects.filter(plan=sub.plan, is_enabled=True)
        for f in features_list:
            usage_obj = MemberFeatureUsage.objects.filter(subscription=sub, feature_code=f.feature_code).first()
            used = usage_obj.used_count if usage_obj else 0
            is_unlimited = f.is_unlimited or f.limit_type == 'unlimited'
            limit_val = f.limit_value
            
            remaining = "Unlimited" if is_unlimited else max(0, limit_val - used)
            percentage = 0 if is_unlimited else min(100, int((used / limit_val) * 100)) if limit_val > 0 else 0
            
            status = "Unlocked"
            if not f.is_enabled:
                status = "Locked"
            elif not is_unlimited and used >= limit_val:
                status = "Exceeded"
            elif sub.status == 'expired':
                status = "Expired"
                
            usages.append({
                "feature_code": f.feature_code,
                "name": f.name,
                "description": f.description,
                "category": f.category,
                "icon": f.icon or "star",
                "used_count": used,
                "limit_value": limit_val,
                "limit_type": f.limit_type,
                "is_unlimited": is_unlimited,
                "remaining": remaining,
                "percentage": percentage,
                "status": status
            })
        data['usages'] = usages

        # 2. Timeline Events (Chronological Member Premium Audit Log)
        from api.models import MemberPremiumAuditLog
        logs = MemberPremiumAuditLog.objects.filter(member=member).order_by('-timestamp')[:20]
        timeline = []
        for log in logs:
            timeline.append({
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "created_at": log.timestamp,
                "performed_by": log.performed_by.username if log.performed_by else 'System'
            })
        data['timeline'] = timeline

        # 3. Invoices
        from api.models import MemberPremiumInvoice
        tx_ids = [t['id'] for t in data.get('transactions', [])]
        invoices = MemberPremiumInvoice.objects.filter(transaction_id__in=tx_ids).order_by('-created_at')
        from api.serializers import MemberPremiumInvoiceSerializer
        data['invoices'] = MemberPremiumInvoiceSerializer(invoices, many=True).data

        # 4. Addons
        from api.models import MemberPremiumAddon
        addons = MemberPremiumAddon.objects.filter(active=True)
        from api.serializers import MemberPremiumAddonSerializer
        data['addons'] = MemberPremiumAddonSerializer(addons, many=True).data

        # 5. Coupons
        from api.models import MemberPremiumCoupon
        coupons = MemberPremiumCoupon.objects.filter(is_active=True)
        from api.serializers import MemberPremiumCouponSerializer
        data['coupons'] = MemberPremiumCouponSerializer(coupons, many=True).data

        # 6. Support Details based on Plan
        plan = sub.plan
        plan_code = plan.code if plan else 'free'
        support_email = plan.metadata.get('support_email') if plan and plan.metadata else None
        if not support_email and plan:
            if plan.plan_type == 'free' or plan.code == 'free':
                support_email = "support@waghub.com"
            else:
                support_email = f"{plan.code}-support@waghub.com"

        if plan and plan.metadata and 'support_details' in plan.metadata:
            support_info = plan.metadata['support_details']
        else:
            if plan and (plan.plan_type in ['platinum', 'diamond', 'lifetime'] or plan.monthly_price >= 200):
                support_info = {
                    "priority": "Urgent (within 2 hours)",
                    "type": "Dedicated Account Specialist",
                    "hours": "24/7 Live Chat & Phone Support",
                    "email": support_email or "platinum-support@waghub.com",
                    "chat_enabled": True,
                    "phone_enabled": True
                }
            elif plan and (plan.plan_type in ['gold', 'silver'] or plan.monthly_price >= 100):
                support_info = {
                    "priority": "High (within 6 hours)",
                    "type": "Priority Helpdesk Agent",
                    "hours": "9 AM - 9 PM IST Daily",
                    "email": support_email or "gold-support@waghub.com",
                    "chat_enabled": True,
                    "phone_enabled": False
                }
            else:
                support_info = {
                    "priority": "Standard (24-48 hours)",
                    "type": "Community Support Desk",
                    "hours": "9 AM - 5 PM IST (Mon-Fri)",
                    "email": support_email or "support@waghub.com",
                    "chat_enabled": False,
                    "phone_enabled": False
                }
        data['support_details'] = support_info

        return Response(data)

    def _ensure_features_for_plan(self, plan):
        ensure_features_for_member_plan(plan)

    @action(detail=True, methods=['post'], url_path='renew')
    def renew(self, request, pk=None):
        sub = self.get_object()
        billing_cycle = request.data.get('billing_cycle', sub.billing_cycle)
        plan = sub.plan
        if not plan:
            return Response({"detail": "Cannot renew subscription because no plan is currently assigned."}, status=400)
            
        price = Decimal(str(plan.monthly_price if billing_cycle == 'monthly' else plan.yearly_price))
        from django.utils import timezone
        import datetime
        now = timezone.now()
        
        current_end = sub.end_date if sub.is_currently_active() and sub.end_date else now
        cycle_days = {'monthly': 30, 'quarterly': 91, 'half_yearly': 182, 'yearly': 365}
        days = cycle_days.get(billing_cycle)
        new_end = current_end + datetime.timedelta(days=days) if days else None
        
        sub.status = 'active'
        sub.billing_cycle = billing_cycle
        sub.end_date = new_end
        sub.save()
        
        import random
        txn = MemberPremiumTransaction.objects.create(
            subscription=sub,
            transaction_type='renewal',
            transaction_status='success',
            amount=price,
            gst_amount=price * Decimal('0.18'),
            total_amount=price * Decimal('1.18'),
            payment_method=request.data.get('payment_method', 'Razorpay'),
            transaction_ref=f"TXN-REN-{random.randint(100000, 999999)}",
            plan=plan,
            billing_cycle=billing_cycle
        )
        
        import time
        import random
        random_suffix = random.randint(1000, 9999)
        invoice_no = f"INV-MP-{int(time.time())}-{random_suffix}"
        MemberPremiumInvoice.objects.create(
            transaction=txn,
            invoice_no=invoice_no,
            gst_invoice_no=f"GST-MP-{int(time.time())}-{random_suffix}",
            subtotal=price,
            gst_percentage=18,
            gst_amount=txn.gst_amount,
            total=txn.total_amount,
            paid=True,
            notes=f"Renewal of plan {plan.name}."
        )
        
        MemberPremiumAuditLog.objects.create(
            action='subscription_renewed',
            member=sub.member,
            subscription=sub,
            plan=plan,
            description=f"Subscription renewed for {billing_cycle}",
            performed_by=request.user if request.user.is_authenticated else None,
        )
        if sub.member and sub.member.user:
            self._clear_sidebar_cache(sub.member.user)
        return Response(MemberPremiumSubscriptionSerializer(sub, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        sub = self.get_object()
        billing_cycle = request.data.get('billing_cycle', sub.billing_cycle)
        plan = sub.plan
        from django.utils import timezone
        import datetime
        now = timezone.now()
        sub.status = 'active'
        sub.start_date = now
        cycle_days = {'monthly': 30, 'quarterly': 91, 'half_yearly': 182, 'yearly': 365, 'lifetime': None, 'trial': plan.trial_days if plan else 14}
        days = cycle_days.get(billing_cycle)
        if days:
            sub.end_date = now + datetime.timedelta(days=days)
        else:
            sub.end_date = None
        sub.billing_cycle = billing_cycle
        sub.save()
        MemberPremiumAuditLog.objects.create(
            action='subscription_activated',
            member=sub.member,
            subscription=sub,
            plan=plan,
            description=f"Subscription activated – {billing_cycle}",
            performed_by=request.user if request.user.is_authenticated else None,
        )
        if sub.member and sub.member.user:
            self._clear_sidebar_cache(sub.member.user)
        return Response(MemberPremiumSubscriptionSerializer(sub, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        sub = self.get_object()
        sub.status = 'cancelled'
        sub.auto_renew = False
        sub.save()
        MemberPremiumAuditLog.objects.create(
            action='subscription_cancelled',
            member=sub.member,
            subscription=sub,
            plan=sub.plan,
            description=request.data.get('reason', 'Cancelled by admin'),
            performed_by=request.user if request.user.is_authenticated else None,
        )
        if sub.member and sub.member.user:
            self._clear_sidebar_cache(sub.member.user)
        return Response({"detail": "Subscription cancelled."})

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, pk=None):
        sub = self.get_object()
        sub.status = 'suspended'
        sub.save()
        MemberPremiumAuditLog.objects.create(
            action='subscription_suspended',
            member=sub.member,
            subscription=sub,
            plan=sub.plan,
            description=request.data.get('reason', 'Suspended by admin'),
            performed_by=request.user if request.user.is_authenticated else None,
        )
        if sub.member and sub.member.user:
            self._clear_sidebar_cache(sub.member.user)
        return Response({"detail": "Subscription suspended."})

    @action(detail=True, methods=['post'], url_path='upgrade')
    def upgrade(self, request, pk=None):
        sub = self.get_object()
        new_plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        payment_method = request.data.get('payment_method', 'Razorpay')
        
        if not new_plan_id:
            return Response({"detail": "plan_id is required."}, status=400)
        try:
            new_plan = MemberPremiumPlan.objects.get(id=new_plan_id)
        except MemberPremiumPlan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=404)
            
        old_plan = sub.plan
        
        # Calculate new end date based on billing cycle
        from django.utils import timezone
        import datetime
        from decimal import Decimal
        import random
        import time
        
        now = timezone.now()
        cycle_days = {'monthly': 30, 'quarterly': 91, 'half_yearly': 182, 'yearly': 365, 'lifetime': None}
        days = cycle_days.get(billing_cycle)
        new_end = now + datetime.timedelta(days=days) if days else None
        
        sub.plan = new_plan
        sub.status = 'active'
        sub.billing_cycle = billing_cycle
        sub.start_date = now
        sub.end_date = new_end
        sub.save()
        
        # Calculate price
        cycle_prices = {
            'monthly': new_plan.monthly_price,
            'quarterly': new_plan.quarterly_price,
            'half_yearly': new_plan.half_yearly_price,
            'yearly': new_plan.yearly_price,
            'lifetime': new_plan.lifetime_price,
        }
        price = Decimal(str(cycle_prices.get(billing_cycle, new_plan.monthly_price)))
        
        # Record Transaction
        txn = MemberPremiumTransaction.objects.create(
            subscription=sub,
            transaction_type='upgrade',
            transaction_status='success',
            amount=price,
            gst_amount=price * Decimal('0.18'),
            total_amount=price * Decimal('1.18'),
            payment_method=payment_method,
            transaction_ref=f"TXN-UPG-{random.randint(100000, 999999)}",
            plan=new_plan,
            billing_cycle=billing_cycle
        )
        
        import random
        random_suffix = random.randint(1000, 9999)
        invoice_no = f"INV-MP-{int(time.time())}-{random_suffix}"
        MemberPremiumInvoice.objects.create(
            transaction=txn,
            invoice_no=invoice_no,
            gst_invoice_no=f"GST-MP-{int(time.time())}-{random_suffix}",
            subtotal=price,
            gst_percentage=18,
            gst_amount=txn.gst_amount,
            total=txn.total_amount,
            paid=True,
            notes=f"Upgrade to plan {new_plan.name} ({billing_cycle})."
        )
        
        MemberPremiumAuditLog.objects.create(
            action='subscription_upgraded',
            member=sub.member,
            subscription=sub,
            plan=new_plan,
            old_value=old_plan.name if old_plan else '',
            new_value=new_plan.name,
            description=f"Upgraded from {old_plan.name if old_plan else 'N/A'} to {new_plan.name} ({billing_cycle})",
            performed_by=request.user if request.user.is_authenticated else None,
        )
        if sub.member and sub.member.user:
            self._clear_sidebar_cache(sub.member.user)
        return Response(MemberPremiumSubscriptionSerializer(sub, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='assign')
    def assign_subscription(self, request):
        member_id = request.data.get('member_id')
        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        amount_paid = request.data.get('amount_paid', 0)
        payment_method = request.data.get('payment_method', 'Manual')
        notes = request.data.get('notes', '')

        try:
            member = Member.objects.get(id=member_id)
            plan = MemberPremiumPlan.objects.get(id=plan_id)
        except (Member.DoesNotExist, MemberPremiumPlan.DoesNotExist) as e:
            return Response({"detail": str(e)}, status=400)

        from django.utils import timezone
        import datetime
        now = timezone.now()
        cycle_days = {'monthly': 30, 'quarterly': 91, 'half_yearly': 182, 'yearly': 365}
        days = cycle_days.get(billing_cycle)

        sub = MemberPremiumSubscription.objects.create(
            member=member,
            plan=plan,
            status='active',
            billing_cycle=billing_cycle,
            start_date=now,
            end_date=now + datetime.timedelta(days=days) if days else None,
            auto_renew=True,
            amount_paid=amount_paid,
            payment_method=payment_method,
            notes=notes,
        )
        MemberPremiumAuditLog.objects.create(
            action='subscription_activated',
            member=member,
            subscription=sub,
            plan=plan,
            description=f"Plan assigned by admin: {plan.name} ({billing_cycle})",
            performed_by=request.user if request.user.is_authenticated else None,
        )
        return Response(MemberPremiumSubscriptionSerializer(sub, context={'request': request}).data, status=201)

    @action(detail=False, methods=['post'], url_path='check-feature')
    def check_feature(self, request):
        member_id = request.data.get('member_id')
        if not member_id and request.user.is_authenticated:
            try:
                member = request.user.member_profile
            except Exception:
                return Response({"has_access": False, "reason": "Member not found."})
        else:
            try:
                member = Member.objects.get(id=member_id)
            except Member.DoesNotExist:
                return Response({"has_access": False, "reason": "Member not found."})

        feature_code = request.data.get('feature_code', '').upper()
        has_access, reason = check_member_feature_limit(member, feature_code)
        
        if not has_access:
            return Response({
                "has_access": False,
                "reason": reason,
                "upgrade_message": reason
            })
            
        sub = MemberPremiumSubscription.objects.filter(member=member).order_by('-created_at').first()
        plan = sub.plan if sub else None
        feature = MemberPremiumFeature.objects.filter(plan=plan, feature_code=feature_code).first()
        
        if feature:
            usage = MemberFeatureUsage.objects.filter(subscription=sub, feature_code=feature_code).first()
            used = usage.used_count if usage else 0
            if feature.is_unlimited or feature.limit_type == 'unlimited':
                return Response({"has_access": True, "feature": MemberPremiumFeatureSerializer(feature).data, "unlimited": True})
            else:
                return Response({
                    "has_access": True,
                    "feature": MemberPremiumFeatureSerializer(feature).data,
                    "used": used,
                    "limit": feature.limit_value,
                    "remaining": max(0, feature.limit_value - used)
                })
                
        return Response({"has_access": True, "unlimited": True})


class MemberFeatureUsageViewSet(viewsets.ModelViewSet):
    queryset = MemberFeatureUsage.objects.all()
    serializer_class = MemberFeatureUsageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(subscription__member__user=user)
        return qs


class MemberPremiumTransactionViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumTransaction.objects.select_related('plan', 'subscription__member').order_by('-created_at')
    serializer_class = MemberPremiumTransactionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(subscription__member__user=user)
        subscription_id = self.request.query_params.get('subscription')
        if subscription_id:
            qs = qs.filter(subscription_id=subscription_id)
        return qs


class MemberPremiumInvoiceViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumInvoice.objects.all().order_by('-created_at')
    serializer_class = MemberPremiumInvoiceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(transaction__subscription__member__user=user)
        return qs

    def perform_create(self, serializer):
        import time
        import random
        random_suffix = random.randint(1000, 9999)
        invoice_no = f"INV-MP-{int(time.time())}-{random_suffix}"
        serializer.save(invoice_no=invoice_no)


class MemberAddonPurchaseViewSet(viewsets.ModelViewSet):
    queryset = MemberAddonPurchase.objects.select_related('member', 'addon').order_by('-created_at')
    serializer_class = MemberAddonPurchaseSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(member__user=user)
        return qs


class MemberPremiumAuditLogViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumAuditLog.objects.select_related('member', 'subscription', 'plan', 'performed_by').order_by('-timestamp')
    serializer_class = MemberPremiumAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        member = getattr(user, 'member_profile', None) if user.is_authenticated else None
        serializer.save(
            member=member,
            performed_by=user if user.is_authenticated else None
        )

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(member__user=user)
        member_id = self.request.query_params.get('member')
        plan_id = self.request.query_params.get('plan')
        action_filter = self.request.query_params.get('action')
        if member_id:
            qs = qs.filter(member_id=member_id)
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        if action_filter:
            qs = qs.filter(action=action_filter)
        return qs


class MemberPremiumRewardViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumReward.objects.all().order_by('-id')
    serializer_class = MemberPremiumRewardSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(member__user=user)
        return qs


class MemberPremiumSupportTicketViewSet(viewsets.ModelViewSet):
    queryset = MemberPremiumSupportTicket.objects.all().order_by('-created_at')
    serializer_class = MemberPremiumSupportTicketSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if not user.is_superuser:
            qs = qs.filter(member__user=user)
        return qs

    def perform_create(self, serializer):
        import random
        ticket_no = f"{random.randint(100000, 999999)}"
        member = self.request.user.member_profile
        serializer.save(member=member, ticket_no=ticket_no)


# Phase 3.3: Community Subscription Management ViewSets
class CommunityLicenseViewSet(viewsets.ModelViewSet):
    queryset = CommunityLicense.objects.all().order_by('-activated_date')
    serializer_class = CommunityLicenseSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityModuleAccessViewSet(viewsets.ModelViewSet):
    queryset = CommunityModuleAccess.objects.all().order_by('module__sort_order')
    serializer_class = CommunityModuleAccessSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityUsageViewSet(viewsets.ModelViewSet):
    queryset = CommunityUsage.objects.all()
    serializer_class = CommunityUsageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityBillingViewSet(viewsets.ModelViewSet):
    queryset = CommunityBilling.objects.all()
    serializer_class = CommunityBillingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityInvoiceViewSet(viewsets.ModelViewSet):
    queryset = CommunityInvoice.objects.all().order_by('-created_at')
    serializer_class = CommunityInvoiceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityTransactionViewSet(viewsets.ModelViewSet):
    queryset = CommunityTransaction.objects.all().order_by('-created_at')
    serializer_class = CommunityTransactionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        return qs


class CommunityAddonViewSet(viewsets.ModelViewSet):
    queryset = CommunityAddon.objects.all().order_by('-id')
    serializer_class = CommunityAddonSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class CommunityAuditLogViewSet(viewsets.ModelViewSet):
    queryset = CommunityAuditLog.objects.all().order_by('-timestamp')
    serializer_class = CommunityAuditLogSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


