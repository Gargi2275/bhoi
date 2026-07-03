import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from api.models import Community

for c in Community.objects.all():
    print(f"ID:{c.id} | Name:{c.name} | Parent ID:{c.parent_id}")
