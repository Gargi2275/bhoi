import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MatrimonyProfile
from api.preference_engine import PreferenceEngine

p = MatrimonyProfile.objects.get(id=1)
pref = PreferenceEngine.get_partner_preference(p)
print(f"Candidate: {p.name}, Gender: {p.gender}")
print(f"Pref Gender: {pref.gender}")
