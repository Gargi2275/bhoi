import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Member, MatrimonyProfile, Community

# Get the first community admin
admin_member = Member.objects.filter(role='community_admin').first()
if admin_member:
    print(f"Admin: {admin_member.user.username}, Community: {admin_member.community_id}")
    profiles = MatrimonyProfile.objects.filter(deleted_at__isnull=True)
    profiles = profiles.filter(community_id=admin_member.community_id)
    print(f"Profiles for community {admin_member.community_id}: {profiles.count()}")
    for p in profiles:
        print(f"  Profile {p.id}: {p.name}, Status: {p.status}")
else:
    print("No admin member found.")
