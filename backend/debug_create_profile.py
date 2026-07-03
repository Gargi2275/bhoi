import os
import sys
import django
import traceback
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from api.models import MatrimonyProfile

User = get_user_model()

def debug_create():
    user = User.objects.filter(username__icontains='member2').first()
    if not user:
        user = User.objects.filter(member_profile__name__icontains='member2').first()
    
    # Delete existing profiles for this user first
    MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).delete()

    client = APIClient()
    client.force_authenticate(user)
    
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    photo_file = SimpleUploadedFile("test_photo.jpg", img_byte_arr.read(), content_type="image/jpeg")
    
    payload = {
        'relationship': 'Self',
        'marital_status': 'Single',
        'education': 'BE',
        'profession': 'Engineer',
        'photo': photo_file,
        'filter_min_age': 'NaN',  # Pass invalid integer value
    }
    
    print("Sending POST request with filter_min_age='NaN'...")
    try:
        response = client.post('/api/matrimony-profiles/my-profile/', payload, format='multipart')
        print(f"Profile Create Status Code: {response.status_code}")
        if response.status_code == 500:
            print("Successfully reproduced 500 Internal Server Error!")
    except Exception as e:
        print("Crash detected during profile creation:")
        traceback.print_exc()

if __name__ == '__main__':
    debug_create()
