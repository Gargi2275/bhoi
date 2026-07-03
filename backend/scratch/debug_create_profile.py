import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from api.models import MatrimonyProfile, Member

User = get_user_model()

def debug_create():
    # Find user member2
    user = User.objects.filter(username__icontains='member2').first()
    if not user:
        user = User.objects.filter(member_profile__name__icontains='member2').first()
    if not user:
        user = User.objects.first()
    
    print(f"Using user: {user.username}")
    
    # Check if a profile already exists. If yes, let's delete it so we can test creation.
    existing = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True)
    if existing.exists():
        print(f"Deleting existing profile(s) for user: {[p.id for p in existing]}")
        existing.delete()

    client = APIClient()
    client.force_authenticate(user)
    
    payload = {
        'relationship': 'Self',
        'gender': 'Groom',
        'education': 'BE',
        'profession': 'Engineer',
        'marital_status': 'Never Married',
        'visibility_scope': 'Private',
    }
    
    print("Sending POST request to /api/matrimony-profiles/my-profile/...")
    try:
        response = client.post('/api/matrimony-profiles/my-profile/', payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response data: {response.data}")
    except Exception as e:
        print("Crash detected:")
        traceback.print_exc()

if __name__ == '__main__':
    debug_create()
