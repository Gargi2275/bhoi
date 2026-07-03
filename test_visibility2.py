import os, sys, django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Community, MatrimonyProfile, User, Member
from api.visibility_engine import MatrimonyVisibilityService

root = Community.objects.create(name='Root Comm')
child1 = Community.objects.create(name='Child 1', parent=root)
child2 = Community.objects.create(name='Child 2', parent=root)
grandchild = Community.objects.create(name='Grandchild', parent=child1)

# Get a profile
p = MatrimonyProfile.objects.filter(visibility_type='COMMUNITY_NETWORK').first()
if not p:
    p = MatrimonyProfile.objects.first()
    if p:
        p.visibility_type = 'COMMUNITY_NETWORK'
        p.hierarchy_scope = 'Entire Hierarchy Chain'
        p.save()

p.community = child1
p.hierarchy_scope = 'Entire Hierarchy Chain'
p.save()

class MP:
    def __init__(self, comm):
        self.community = comm
        self.role = 'member'

class MockViewer:
    def __init__(self, comm):
        self.is_authenticated = True
        self.is_superuser = False
        self.id = 999999
        self.member_profile = MP(comm)

# Patch the user retrieval for the test
original_filter = MatrimonyProfile.objects.filter
def fake_filter(*args, **kwargs):
    if kwargs.get('user') and kwargs['user'].id == 999999:
        class FakeQS:
            def first(self):
                # mock viewer profile
                class VP:
                    status = 'Approved'
                return VP()
        return FakeQS()
    return original_filter(*args, **kwargs)

MatrimonyProfile.objects.filter = fake_filter

print("Testing 'Entire Community Tree' from profile in Child 1")
print("Viewer in Root (Ancestor):", MatrimonyVisibilityService.can_appear_in_listings(p, MockViewer(root)))
print("Viewer in Child 1 (Same):", MatrimonyVisibilityService.can_appear_in_listings(p, MockViewer(child1)))
print("Viewer in Grandchild (Descendant):", MatrimonyVisibilityService.can_appear_in_listings(p, MockViewer(grandchild)))
print("Viewer in Child 2 (Sibling):", MatrimonyVisibilityService.can_appear_in_listings(p, MockViewer(child2)))

root.delete()
