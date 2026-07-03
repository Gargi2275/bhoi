import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from api.models import MatrimonyProfile, User
from api.views import MatrimonyProfileViewSet

user = User.objects.get(username="test_845")
my_profile = MatrimonyProfile.objects.get(user=user)
viewset = MatrimonyProfileViewSet()
pref = viewset._load_partner_preference(my_profile, user)

# Look at member (ID 4)
p = MatrimonyProfile.objects.get(id=4)
print("Member status:", p.status, "verified:", p.is_verified, "deleted:", p.deleted_at)
print("Active/approved?", viewset._profile_is_active_and_approved(p))

visible, reason = viewset._profile_visibility_reason(p, user, my_profile)
print("Visible?", visible, "Reason:", reason)

expected_gender = 'Groom' if my_profile.gender == 'Bride' else 'Bride'
print("Gender matches?", p.gender == expected_gender)

# Wait! Does the matching algorithm in matches endpoint filter strictly by opposite gender?
# Let's check viewset.matches code:
# if p.gender != expected_gender:
#     continue
# Yes! Line 4367 in views.py checks:
# if p.gender != expected_gender:
#     continue
# And expected_gender is 'Bride' because my_profile.gender is 'Groom'!
# Since member.gender is 'Groom', he is filtered out because they are the same gender!
