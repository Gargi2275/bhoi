import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile, PartnerPreference

print("=== Partner Preferences ===")
for p in MatrimonyProfile.objects.filter(deleted_at__isnull=True):
    pref = PartnerPreference.objects.filter(profile=p).first()
    if pref:
        print(f"Profile ID: {p.id} | Name: {p.name} | Gender: {p.gender} | Caste: {p.caste} | Comm: {p.community.name if p.community else 'None'}")
        print(f"  Pref Gender: {pref.gender}")
        print(f"  Pref Age: {pref.min_age} - {pref.max_age}")
        print(f"  Pref Marital: {pref.marital_status}")
        print(f"  Pref Caste: {pref.caste}")
        print(f"  Pref Comm: {pref.preferred_communities}")
        print(f"  Pref State/City: {pref.state} / {pref.city}")
        print(f"  Pref Education/Occupation: {pref.education} / {pref.occupation}")
        print("-" * 50)
