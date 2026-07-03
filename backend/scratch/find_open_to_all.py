import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile

print("=== PLATFORM_WIDE Matrimony Profiles ===")
for p in MatrimonyProfile.objects.filter(visibility_type__in=['PLATFORM_WIDE', 'Platform Wide', 'Platform_Wide']):
    print(f"ID: {p.id}")
    print(f"  Name: {p.name}")
    print(f"  User: {p.user.username if p.user else 'None'}")
    print(f"  Status: {p.status}")
    print(f"  Verified: {p.is_verified}")
    print(f"  Contact Share: {getattr(p, 'contact_permission', 'N/A')}")
    print(f"  Photo Share: {getattr(p, 'photo_permission', 'N/A')}")
    print(f"  Gender: {p.gender}")
    print(f"  Age: {p.age}")
    print(f"  Community: {p.community.name if p.community else 'None'} (id={p.community_id})")
    print(f"  Deleted: {p.deleted_at}")
    print("-" * 40)
