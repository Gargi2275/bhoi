import os, sys, django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Community

root = Community.objects.create(name='Root Comm')
child1 = Community.objects.create(name='Child 1', parent=root)
child2 = Community.objects.create(name='Child 2', parent=root)
grandchild = Community.objects.create(name='Grandchild', parent=child1)

# Just test the hierarchy logic directly
def check_scope(p_comm, v_comm, scope):
    p_comm_id = p_comm.id
    v_comm_id = v_comm.id

    if scope in ('Entire Hierarchy Chain', 'Entire Network', 'Entire Community Tree'):
        hierarchy_ids = {p_comm_id}
        curr = p_comm
        while curr and curr.parent_id:
            hierarchy_ids.add(curr.parent_id)
            curr = curr.parent
        def get_desc_ids(comm):
            ids = []
            if comm:
                for child in comm.subsidiaries.all():
                    ids.append(child.id)
                    ids.extend(get_desc_ids(child))
            return ids
        hierarchy_ids.update(get_desc_ids(p_comm))
        return v_comm_id in hierarchy_ids

print("Testing 'Entire Community Tree' from profile in Child 1")
print("Viewer in Root (Ancestor):", check_scope(child1, root, 'Entire Community Tree'))
print("Viewer in Child 1 (Same):", check_scope(child1, child1, 'Entire Community Tree'))
print("Viewer in Grandchild (Descendant):", check_scope(child1, grandchild, 'Entire Community Tree'))
print("Viewer in Child 2 (Sibling):", check_scope(child1, child2, 'Entire Community Tree'))

root.delete()
