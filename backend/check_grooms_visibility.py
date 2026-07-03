import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from api.models import MatrimonyProfile

grooms = MatrimonyProfile.objects.filter(gender='Groom')
for p in grooms:
    print(f"ID:{p.id} | Name:{p.name} | Status:{p.status} | Verified:{p.is_verified} | Comm:{p.community.name if p.community else 'None'} | VisType:{getattr(p, 'visibility_type', 'N/A')} | Scope:{getattr(p, 'hierarchy_scope', 'N/A')}")
