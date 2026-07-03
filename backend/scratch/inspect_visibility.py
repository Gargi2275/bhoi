import os
import sys
import django

# Set up django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile

profiles = MatrimonyProfile.objects.all()
print(f"Total matrimony profiles: {profiles.count()}")
visibility_types = {}
for p in profiles:
    vt = p.visibility_type
    visibility_types[vt] = visibility_types.get(vt, 0) + 1

print("\nVisibility Types in Database:")
for vt, count in visibility_types.items():
    print(f"- {vt}: {count}")
