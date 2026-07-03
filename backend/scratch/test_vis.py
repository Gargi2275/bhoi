import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile
from api.preference_engine import PreferenceEngine

p = MatrimonyProfile.objects.filter(name__icontains='member2').first()
for name in ['dixita', 'member', 'Harshil Shah', 'Female Sc1']:
    cand = MatrimonyProfile.objects.filter(name__icontains=name).first()
    visible, reason = PreferenceEngine.check_visibility_and_privacy(p, cand)
    print(f"Cand {cand.name} (VisType: {cand.visibility_type}) -> Visible: {visible} ({reason})")
