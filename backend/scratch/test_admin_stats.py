import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from api.views import MatrimonyProfileViewSet
from django.contrib.auth.models import User
from api.models import Member

admin_member = Member.objects.filter(role='community_admin').first()
if admin_member:
    user = admin_member.user
    factory = RequestFactory()
    request = factory.get(f'/api/matrimony-profiles/admin-stats/?communityId={admin_member.community_id}')
    request.user = user

    view = MatrimonyProfileViewSet.as_view({'get': 'admin_stats'})
    response = view(request)
    print("Response data:")
    print(response.data)
