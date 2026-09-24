import os
import sys
sys.path.append(os.getcwd())

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth.models import User
from api.models import Member

print("Searching for User/Member with email containing 'shahharshiil303':")
users = User.objects.filter(email__icontains='shahharshiil303')
for u in users:
    print(f"User ID: {u.id}, Username: {u.username}, Email: {u.email}, Active: {u.is_active}, Staff: {u.is_staff}, Superuser: {u.is_superuser}")
    member = Member.objects.filter(user=u).first()
    if member:
        print(f"  Member ID: {member.id}, Name: {member.name}, Status: {member.status}, Role: {member.role}")
    else:
        print("  No linked Member profile.")

members = Member.objects.filter(email__icontains='shahharshil303')
for m in members:
    print(f"Member ID: {m.id}, Name: {m.name}, Email: {m.email}, Status: {m.status}, Role: {m.role}")
    if m.user:
         print(f"  Linked User ID: {m.user.id}, Username: {m.user.username}, Email: {m.user.email}, Active: {m.user.is_active}")
    else:
         print("  No linked User profile.")
