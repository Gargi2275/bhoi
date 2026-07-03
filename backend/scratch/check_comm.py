import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile
p = MatrimonyProfile.objects.get(id=52)
print(f"Community: {p.community_id}")
