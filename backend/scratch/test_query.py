import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile

qs = MatrimonyProfile.objects.filter(gender__in=['Female', 'Bride'], age__gte=18, age__lte=60, status__in=['Approved', 'Active', 'Featured'], deleted_at__isnull=True)
print(f"Total rows found: {qs.count()}")
for p in qs:
    print(p.name, p.gender, p.age, p.status)

