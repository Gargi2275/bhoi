import os
import sys
sys.path.append(os.getcwd())

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import Member

m = Member.objects.get(email='member3@samaj.in', community_id=137)
print(f"Name: {m.name}, Role: {m.role}, CustomRole: {m.custom_role}, CustomRoleName: {m.custom_role.name if m.custom_role else 'None'}")
