import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference, Community, User, Member
from api.visibility_engine import MatrimonyVisibilityService

# Clean up
User.objects.filter(username__in=['male_sc1', 'female_sc1']).delete()
comm, _ = Community.objects.get_or_create(name='Test Comm', status='Approved')

u1 = User.objects.create_user(username='male_sc1', password='password123')
m1 = Member.objects.create(user=u1, name='Male Sc1', age=28, gender='Male', community=comm, status='Active')
p1 = MatrimonyProfile.objects.create(user=u1, name='Male Sc1', gender='Male', age=28, community=comm, status='Active', is_verified=True, marital_status='Never Married')

u2 = User.objects.create_user(username='female_sc1', password='password123')
m2 = Member.objects.create(user=u2, name='Female Sc1', age=25, gender='Female', community=comm, status='Active')
p2 = MatrimonyProfile.objects.create(user=u2, name='Female Sc1', gender='Female', age=25, community=comm, status='Active', is_verified=True, marital_status='Never Married')

profile = p2
viewer_user = u1
print(f"profile.status: {profile.status}")
print(f"profile.is_verified: {profile.is_verified}")
print(f"viewer_user.is_authenticated: {viewer_user.is_authenticated}")

viewer_profile = MatrimonyProfile.objects.filter(user=viewer_user, deleted_at__isnull=True).first()
print(f"viewer_profile status: {viewer_profile.status}")
print(f"profile.visibility_type: {profile.visibility_type}")

try:
    viewer_community = viewer_user.member_profile.community
except Exception as e:
    viewer_community = None
    print(f"Exception: {e}")

print(f"viewer_community: {viewer_community}")
print(f"p_comm_id: {profile.community_id}")
print(f"v_comm_id: {viewer_community.id if viewer_community else None}")
print(f"hierarchy_scope: {profile.hierarchy_scope}")

print(f"Final result: {MatrimonyVisibilityService.can_appear_in_listings(profile, viewer_user)}")
