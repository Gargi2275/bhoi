import os
import sys
import django

sys.path.append(r'c:\Users\HP\Downloads\we-are-going-home-main\we-are-going-home-main\backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import MatrimonyProfile, PartnerPreference, Community, User, Member
from api.preference_engine import PreferenceEngine

User.objects.filter(username__in=['m_state_y', 'f_state_y']).delete()
comm, _ = Community.objects.get_or_create(name='Parent Community', status='Approved')

def _create_user_and_profile(username, name, gender, age, community, **kwargs):
    user = User.objects.create_user(username=username, password='password123')
    Member.objects.create(
        user=user,
        name=name,
        age=age,
        gender='Female' if gender in ('Bride', 'Female') else 'Male',
        community=community,
        status='Active',
    )
    profile = MatrimonyProfile.objects.create(
        user=user,
        name=name,
        gender='Female' if gender in ('Bride', 'Female') else 'Male',
        age=age,
        marital_status='Never Married',
        state='Gujarat',
        community=community,
        status='Active',
        is_verified=True,
        **kwargs
    )
    return user, profile

m_user, m_prof = _create_user_and_profile('m_state_y', 'Male', 'Groom', 28, comm)
f_user, f_prof = _create_user_and_profile('f_state_y', 'Female', 'Bride', 25, comm)

PartnerPreference.objects.create(profile=m_prof, gender='Bride', state='Gujarat', min_age=18, max_age=60)
PartnerPreference.objects.create(profile=f_prof, gender='Groom', min_age=18, max_age=60)

import sys
sys.stdout.reconfigure(encoding='utf-8')
print("m_prof matching f_prof:")
score_details = PreferenceEngine.calculateMatchScore(m_prof, f_prof)
print(score_details)
