import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from rest_framework.test import APIRequestFactory
from api.models import MatrimonyProfile
from api.views import MatrimonyProfileViewSet

p = MatrimonyProfile.objects.get(id=52)
user = p.user

factory = APIRequestFactory()
request = factory.get('/api/matrimony-profiles/matches/')
request.user = user

view = MatrimonyProfileViewSet.as_view({'get': 'matches'})
response = view(request)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(f"Returned {len(response.data)} matches")
    for m in response.data:
        print(f"Match: {m.get('name')}, Score: {m.get('match_score')}")
else:
    print(response.data)
