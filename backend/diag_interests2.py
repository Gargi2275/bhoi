import django, os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
sys.path.insert(0, '.')
django.setup()

from django.contrib.auth.models import User
from api.models import MatrimonyProfile, InterestRequest
from api.serializers import InterestRequestSerializer

user = User.objects.get(email__iexact='member@gmail.com')
my_profile = MatrimonyProfile.objects.filter(user=user, deleted_at__isnull=True).first()

# Simulate what the interests_sent view does
print("=== Interests Sent View Logic ===")
print("Profile status:", my_profile.status)
print("Status check passes:", my_profile.status in ('Approved', 'Active', 'Featured'))

interests = InterestRequest.objects.filter(sender__user=user)
print("Interests found:", interests.count())
for i in interests:
    print("  id=%s, sender=%s, receiver=%s, status=%s" % (i.id, i.sender, i.receiver, i.status))

# Serialize them (without request context — this is the key issue!)
print("\n=== Serialized (no request context) ===")
data = InterestRequestSerializer(interests, many=True).data
for item in data:
    print("  interest id=%s" % item.get('id'))
    print("  receiver_details:", item.get('receiver_details'))
    print("  sender_name:", item.get('sender_name'))
    print("  receiver_name:", item.get('receiver_name'))

print("\n=== Checking receiver_details field ===")
for i in interests:
    print("Interest:", i)
    # Check if receiver is accessible
    try:
        rec = i.receiver
        print("  receiver:", rec, "id:", rec.id, "name:", rec.name)
        print("  receiver.user:", rec.user)
    except Exception as e:
        print("  receiver access error:", e)
