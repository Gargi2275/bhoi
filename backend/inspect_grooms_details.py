import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from api.models import MatrimonyProfile

grooms = MatrimonyProfile.objects.filter(gender='Groom')
for p in grooms:
    print(f"ID:{p.id} | Name:{p.name}")
    print(f"  Community: {p.community.name if p.community else 'None'}")
    print(f"  Visibility Type: {getattr(p, 'visibility_type', 'N/A')}")
    print(f"  Hierarchy Scope: {getattr(p, 'hierarchy_scope', 'N/A')}")
    print(f"  Target Gender: '{p.target_gender}'")
    print(f"  Target Castes: '{p.target_castes}'")
    print(f"  Target Subcastes: '{p.target_subcastes}'")
    print(f"  Target Age: {p.target_age_min} to {p.target_age_max}")
    print(f"  Target Communities Count: {p.target_communities.count()}")
    print("-" * 50)
