import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import MatrimonyProfile, PartnerPreference

User = get_user_model()
user = User.objects.get(username='niralijinjala_997')
my_profile = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()

pref = PartnerPreference.objects.filter(profile=my_profile).first()
print("MY PREF FIELDS:")
for f in pref._meta.fields:
    print(f"  {f.name}: {getattr(pref, f.name)}")

print("\nCANDIDATES DETAILS:")
for p in MatrimonyProfile.objects.filter(status__in=['Approved', 'Active', 'Featured'], is_verified=True, deleted_at__isnull=True).exclude(id=my_profile.id):
    print(f"ID: {p.id}, Name: {p.name}, Gender: {p.gender}, Age: {p.age}, Marital Status: {p.marital_status}, Caste: {p.caste}, State: {p.state}, City: {p.city}")
