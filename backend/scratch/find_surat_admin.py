import os
import sys
sys.path.append(os.getcwd())

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth.models import User
from api.models import Member, Community

communities = Community.objects.filter(name__icontains="Surat")
for c in communities:
    print(f"ID: {c.id}, Name: {c.name}")
    admins = Member.objects.filter(community=c, role__in=["community_admin", "admin", "super_admin"])
    print(f"  Admins found: {admins.count()}")
    for admin in admins:
        user = admin.user
        member_name = getattr(admin, 'name', '') or getattr(admin, 'full_name', '')
        print(f"    Member ID: {admin.id}, Name: {member_name}, Role: {admin.role}")
        if user:
            print(f"      Username: {user.username}, Email: {user.email}")
            # If we want to see if we can log in, we can also check if a password was stored in comments,
            # or check how the user was created. Since passwords are encrypted/hashed in Django,
            # we will output the username and email.
        else:
            print(f"      No associated Django user")
