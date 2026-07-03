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

# Get admin
admin_member = Member.objects.filter(role='community_admin').first()
if admin_member:
    user = admin_member.user
    factory = RequestFactory()
    request = factory.get(f'/api/matrimony-profiles/?communityId={admin_member.community_id}')
    request.user = user

    view = MatrimonyProfileViewSet.as_view({'get': 'list'})
    response = view(request)
    print("Response data:")
    if hasattr(response, 'data'):
        # Paginated response?
        if 'results' in response.data:
            print("Results length:", len(response.data['results']))
            for item in response.data['results']:
                print(item['name'])
        else:
            print("Data length:", len(response.data))
            for item in response.data:
                print(item['name'])
    else:
        print("No response data")
