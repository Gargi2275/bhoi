import django, os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
sys.path.insert(0, '.')
django.setup()

from django.contrib.auth.models import User
from api.models import MatrimonyProfile, InterestRequest

user = User.objects.get(email__iexact='member@gmail.com')
my_profile = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()

print("=== InterestRequests for member ===")
print("my_profile id:", my_profile.id)

sent = InterestRequest.objects.filter(sender=my_profile)
received = InterestRequest.objects.filter(receiver=my_profile)

print("\nSent (%d):" % sent.count())
for i in sent:
    print("  id=%s receiver=%s (id=%s) status=%s" % (i.id, i.receiver.name, i.receiver.id, i.status))
    print("    receiver.status=%s receiver.is_verified=%s" % (i.receiver.status, i.receiver.is_verified))

print("\nReceived (%d):" % received.count())
for i in received:
    print("  id=%s sender=%s (id=%s) status=%s" % (i.id, i.sender.name, i.sender.id, i.status))

# Now simulate what the serializer does
print("\n=== Simulating API response for interests-sent ===")
from api.serializers import InterestRequestSerializer
from api.visibility_engine import PrivacyEngine

for i in sent:
    print("\nInterest id=%s -> receiver=%s" % (i.id, i.receiver.name))
    # The serializer will call receiver_details = MatrimonyProfileSerializer(source='receiver')
    # which calls to_representation(i.receiver) 
    # which checks PrivacyEngine.canViewProfile(i.receiver, user)
    can_view = PrivacyEngine.canViewProfile(i.receiver, user)
    print("  canViewProfile(receiver=%s, viewer=%s): %s" % (i.receiver.name, user.username, can_view))
