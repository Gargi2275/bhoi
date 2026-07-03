from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import BookingProperty, Community, MatrimonyProfile, Member, PartnerPreference, PropertyResource


@override_settings(MATCHING_MODE='OPEN_TEST')
class MatrimonyOpenTestingModeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.community = Community.objects.create(name='Main Community', status='Approved')
        self.user = User.objects.create_user(username='requester', password='pass')
        member = Member.objects.create(
            user=self.user,
            name='Requester Member',
            age=27,
            gender='Female',
            email='requester@example.com',
            phone='9999999999',
            village='Rajkot',
            profession='Manager',
            education='MBA',
            community=self.community,
            status='Active',
        )
        self.client.force_authenticate(self.user)

        # Create a gold plan and subscription so they have MATRIMONY_ACCESS
        from api.models import MemberPremiumPlan, MemberPremiumSubscription
        from django.utils import timezone
        
        plan, _ = MemberPremiumPlan.objects.get_or_create(
            code='gold',
            defaults={
                'name': 'Gold Plan',
                'plan_type': 'gold',
                'status': 'active'
            }
        )
        
        # Ensure features seeded
        from api.views import ensure_features_for_member_plan
        ensure_features_for_member_plan(plan)
        
        MemberPremiumSubscription.objects.create(
            member=member,
            plan=plan,
            status='active',
            billing_cycle='lifetime',
            start_date=timezone.now()
        )

        self.my_profile = self._profile(
            user=self.user,
            name='Requester',
            gender='Bride',
            age=27,
            caste='Patel',
            sub_caste='Leuva',
            state='Gujarat',
            city='Rajkot',
            education='MBA',
            profession='Manager',
        )
        PartnerPreference.objects.create(
            profile=self.my_profile,
            gender='Groom',
            min_age=25,
            max_age=32,
            caste='Patel',
            sub_caste='Leuva',
            state='Gujarat',
            education='MBA',
            marital_status='Never Married',
        )

    def _profile(self, **overrides):
        data = {
            'name': 'Candidate',
            'gender': 'Groom',
            'age': 29,
            'marital_status': 'Never Married',
            'education': 'MBA Finance',
            'profession': 'Manager',
            'income': '10 LPA',
            'caste': 'Patel',
            'sub_caste': 'Leuva',
            'state': 'Gujarat',
            'city': 'Rajkot',
            'country': 'India',
            'community': self.community,
            'visibility_type': 'PLATFORM_WIDE',
            'is_verified': True,
        }
        data.update(overrides)
        profile = MatrimonyProfile.objects.create(**data)
        MatrimonyProfile.objects.filter(pk=profile.pk).update(status='Active', is_verified=True)
        profile.refresh_from_db()
        return profile

    def _set_preference(self, profile, **overrides):
        data = {
            'gender': 'Bride',
            'min_age': 24,
            'max_age': 30,
            'caste': 'Patel',
            'state': 'Gujarat',
            'education': 'MBA',
            'marital_status': 'Never Married',
        }
        data.update(overrides)
        return PartnerPreference.objects.create(profile=profile, **data)

    def _matches(self):
        response = self.client.get('/api/matrimony-profiles/matches/')
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_open_testing_returns_all_other_eligible_profiles(self):
        private_profile = self._profile(name='Private Match', visibility_type='PRIVATE')
        self._set_preference(private_profile, caste='Shah')

        custom_audience_profile = self._profile(
            name='Custom Audience Match',
            visibility_type='CUSTOM_AUDIENCE',
            target_castes='Shah',
            gender='Bride',
        )
        self._set_preference(custom_audience_profile, gender='Groom', caste='Shah')

        result_ids = {item['id'] for item in self._matches()}

        self.assertIn(private_profile.id, result_ids)
        self.assertIn(custom_audience_profile.id, result_ids)
        self.assertNotIn(self.my_profile.id, result_ids)

    def test_open_testing_only_excludes_deleted_suspended_and_same_user_profiles(self):
        approved = self._profile(name='Approved Match')
        unapproved = self._profile(name='Unapproved Match')
        hidden = self._profile(name='Hidden Match')
        suspended = self._profile(name='Suspended Match')
        deleted = self._profile(name='Deleted Match')
        same_user_other_profile = self._profile(user=self.user, name='Same User Family Profile')

        MatrimonyProfile.objects.filter(pk=unapproved.pk).update(is_verified=False)
        MatrimonyProfile.objects.filter(pk=hidden.pk).update(status='Hidden')
        MatrimonyProfile.objects.filter(pk=suspended.pk).update(status='Suspended')
        MatrimonyProfile.objects.filter(pk=deleted.pk).update(deleted_at='2026-06-11T00:00:00Z')

        result_ids = {item['id'] for item in self._matches()}

        self.assertIn(approved.id, result_ids)
        self.assertIn(unapproved.id, result_ids)
        self.assertIn(hidden.id, result_ids)
        self.assertNotIn(suspended.id, result_ids)
        self.assertNotIn(deleted.id, result_ids)
        self.assertNotIn(same_user_other_profile.id, result_ids)

    def test_profile_creation_auto_activates_and_approves_in_open_testing(self):
        new_user = User.objects.create_user(username='new-member', password='pass')
        new_member = Member.objects.create(
            user=new_user,
            name='New Member',
            age=30,
            gender='Male',
            email='new@example.com',
            phone='8888888888',
            village='Rajkot',
            profession='Engineer',
            education='BE',
            community=self.community,
            status='Active',
        )
        # Create subscription for new_member
        from api.models import MemberPremiumPlan, MemberPremiumSubscription
        from django.utils import timezone
        plan = MemberPremiumPlan.objects.get(code='gold')
        MemberPremiumSubscription.objects.create(
            member=new_member,
            plan=plan,
            status='active',
            billing_cycle='lifetime',
            start_date=timezone.now()
        )
        self.client.force_authenticate(new_user)

        response = self.client.post('/api/matrimony-profiles/my-profile/', {
            'relationship': 'Self',
            'gender': 'Groom',
            'education': 'BE',
            'profession': 'Engineer',
            'marital_status': 'Never Married',
        })

        self.assertEqual(response.status_code, 201)
        created = MatrimonyProfile.objects.get(user=new_user)
        self.assertEqual(created.status, 'Active')
        self.assertTrue(created.is_verified)


class MessageTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from .models import Community, Member, Conversation, Message
        self.client = APIClient()
        self.community = Community.objects.create(name='Main Community', status='Approved')
        
        # Create user 1 and member 1
        self.user1 = User.objects.create_user(username='user1', password='pass1')
        self.member1 = Member.objects.create(
            user=self.user1,
            name='Member One',
            age=25,
            gender='Male',
            email='m1@example.com',
            phone='9999999991',
            village='Rajkot',
            profession='Developer',
            education='BTech',
            community=self.community,
            status='Active'
        )
        
        # Create user 2 and member 2
        self.user2 = User.objects.create_user(username='user2', password='pass2')
        self.member2 = Member.objects.create(
            user=self.user2,
            name='Member Two',
            age=24,
            gender='Female',
            email='m2@example.com',
            phone='9999999992',
            village='Rajkot',
            profession='Designer',
            education='BFA',
            community=self.community,
            status='Active'
        )

        # Create a conversation
        self.conversation = Conversation.objects.create(
            participant_1=self.member1,
            participant_2=self.member2
        )
        
        # Create a base message
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.member1,
            content='Hello there!'
        )

        # Create a gold plan and subscriptions so they have MESSAGES_ACCESS
        from .models import MemberPremiumPlan, MemberPremiumSubscription
        from django.utils import timezone
        
        plan = MemberPremiumPlan.objects.create(
            name='Gold Plan',
            code='gold',
            plan_type='gold',
            status='active'
        )
        
        # Ensure features seeded
        from .views import ensure_features_for_member_plan
        ensure_features_for_member_plan(plan)
        
        MemberPremiumSubscription.objects.create(
            member=self.member1,
            plan=plan,
            status='active',
            billing_cycle='lifetime',
            start_date=timezone.now()
        )
        
        MemberPremiumSubscription.objects.create(
            member=self.member2,
            plan=plan,
            status='active',
            billing_cycle='lifetime',
            start_date=timezone.now()
        )

    def test_create_reply_message(self):
        self.client.force_authenticate(self.user2)
        response = self.client.post('/api/messages/', {
            'conversation': self.conversation.id,
            'content': 'General Kenobi!',
            'reply_to_id': self.message.id
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['reply_to'], self.message.id)
        self.assertIsNotNone(data['reply_to_details'])
        self.assertEqual(data['reply_to_details']['content'], 'Hello there!')
        self.assertEqual(data['reply_to_details']['sender_name'], 'Member One')

    def test_message_reactions(self):
        self.client.force_authenticate(self.user2)
        
        # React with 👍
        response = self.client.post(f'/api/messages/{self.message.id}/react/', {
            'emoji': '👍'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['reactions']), 1)
        self.assertEqual(data['reactions'][0]['emoji'], '👍')
        self.assertEqual(data['reactions'][0]['member_name'], 'Member Two')
        
        # Toggle reaction to ❤️
        response = self.client.post(f'/api/messages/{self.message.id}/react/', {
            'emoji': '❤️'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['reactions']), 1)
        self.assertEqual(data['reactions'][0]['emoji'], '❤️')
        
        # Toggle same reaction to remove it
        response = self.client.post(f'/api/messages/{self.message.id}/react/', {
            'emoji': '❤️'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['reactions']), 0)


class PropertyManagementWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.community = Community.objects.create(name='Ahir Samaj', status='Approved')
        self.other_community = Community.objects.create(name='Other Samaj', status='Approved')

        self.super_user = User.objects.create_superuser(username='super', email='super@example.com', password='pass')
        self.admin_user = User.objects.create_user(username='admin', password='pass')
        self.member_user = User.objects.create_user(username='member', password='pass')
        self.other_admin_user = User.objects.create_user(username='other-admin', password='pass')

        self.admin_member = self._member(self.admin_user, 'Community Admin', 'community_admin', self.community)
        self.member = self._member(self.member_user, 'Member User', 'member', self.community)
        self.other_admin_member = self._member(self.other_admin_user, 'Other Admin', 'community_admin', self.other_community)

    def _member(self, user, name, role, community):
        return Member.objects.create(
            user=user,
            name=name,
            age=30,
            gender='Male',
            email=f'{user.username}@example.com',
            phone='9999999999',
            village='Rajkot',
            profession='Engineer',
            education='BE',
            community=community,
            status='Active',
            role=role,
        )

    def _property_payload(self, **overrides):
        data = {
            'name': 'Ahir Samaj Hall',
            'property_type': 'Community Hall',
            'description': 'Community hall for events',
            'address': 'Main Road',
            'city': 'Rajkot',
            'state': 'Gujarat',
            'country': 'India',
            'pincode': '360001',
            'contact_person_name': 'Manager',
            'contact_phone': '9999999999',
            'contact_email': 'manager@example.com',
            'photos': ['https://example.com/cover.jpg'],
            'amenities': ['Parking', 'Kitchen'],
            'cancellation_allowed': True,
            'cancellation_hours': 24,
            'refund_percentage': '75.00',
            'security_deposit': '5000.00',
            'approval_required': True,
            'manual_payment_allowed': True,
            'terms_conditions': 'Use responsibly.',
        }
        data.update(overrides)
        return data

    def test_community_admin_create_defaults_pending_and_hidden_from_member(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.post('/api/booking-properties/', self._property_payload(), format='json')

        self.assertEqual(response.status_code, 201)
        prop = BookingProperty.objects.get(id=response.json()['id'])
        self.assertEqual(prop.community, self.community)
        self.assertEqual(prop.status, 'Pending Approval')

        self.client.force_authenticate(self.member_user)
        member_response = self.client.get('/api/booking-properties/')
        self.assertEqual(member_response.status_code, 200)
        self.assertEqual(member_response.json(), [])

    def test_super_admin_rejection_requires_reason_and_reason_is_visible_to_community_admin(self):
        prop = BookingProperty.objects.create(community=self.community, **self._property_payload())

        self.client.force_authenticate(self.super_user)
        response = self.client.post(f'/api/booking-properties/{prop.id}/reject/', {}, format='json')
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            f'/api/booking-properties/{prop.id}/reject/',
            {'rejection_reason': 'Please add a valid map location.'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        prop.refresh_from_db()
        self.assertEqual(prop.status, 'Rejected')
        self.assertEqual(prop.rejection_reason, 'Please add a valid map location.')

        self.client.force_authenticate(self.admin_user)
        admin_response = self.client.get('/api/booking-properties/')
        self.assertEqual(admin_response.status_code, 200)
        self.assertEqual(admin_response.json()[0]['rejection_reason'], 'Please add a valid map location.')

    def test_approval_makes_property_visible_and_resources_are_community_scoped(self):
        prop = BookingProperty.objects.create(community=self.community, **self._property_payload())
        other_prop = BookingProperty.objects.create(community=self.other_community, **self._property_payload(name='Other Hall'))
        resource = PropertyResource.objects.create(
            property=prop,
            name='Main Hall',
            resource_type='Main Hall',
            capacity=500,
            full_day_rate='15000.00',
            status='Active',
        )
        PropertyResource.objects.create(
            property=other_prop,
            name='Other Hall Resource',
            resource_type='Main Hall',
            capacity=300,
            full_day_rate='12000.00',
            status='Active',
        )

        self.client.force_authenticate(self.super_user)
        response = self.client.post(f'/api/booking-properties/{prop.id}/approve/')
        self.assertEqual(response.status_code, 200)

        self.client.force_authenticate(self.member_user)
        member_response = self.client.get('/api/booking-properties/')
        self.assertEqual(member_response.status_code, 200)
        self.assertEqual([item['id'] for item in member_response.json()], [prop.id])
        self.assertEqual(member_response.json()[0]['starting_price'], 15000.0)

        resources_response = self.client.get('/api/property-resources/')
        self.assertEqual(resources_response.status_code, 200)
        self.assertEqual([item['id'] for item in resources_response.json()], [resource.id])

    def test_community_admin_cannot_create_resource_for_other_community_property(self):
        other_prop = BookingProperty.objects.create(community=self.other_community, **self._property_payload(name='Other Hall'))

        self.client.force_authenticate(self.admin_user)
        response = self.client.post('/api/property-resources/', {
            'property': other_prop.id,
            'name': 'Kitchen',
            'resource_type': 'Kitchen',
            'capacity': 50,
        }, format='json')

        self.assertEqual(response.status_code, 403)


@override_settings(MATCHING_MODE='SMART_MATCHING')
class MatrimonyEnterpriseVisibilityTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, MatrimonyProfile, Member, InterestRequest
        
        # Create communities
        self.community_parent = Community.objects.create(name="Community Parent", state="Gujarat", district="Ahmedabad", status="Approved")
        self.community_child = Community.objects.create(name="Community Child", parent=self.community_parent, state="Gujarat", district="Ahmedabad", status="Approved")
        self.community_outside = Community.objects.create(name="Community Outside", state="Maharashtra", district="Mumbai", status="Approved")

        # Create User A (Female)
        self.user_a = User.objects.create_user(username="usera", email="usera@example.com", password="password")
        self.member_a = Member.objects.create(
            user=self.user_a, name="User A", gender="Female", birthdate="2000-01-01", 
            community=self.community_parent, state="Gujarat", village="Ahmedabad",
            phone="9876543210", email="usera@example.com", education="Graduate", role="member"
        )
        self.profile_a = MatrimonyProfile.objects.create(
            user=self.user_a, name="User A", gender="Bride", dob="2000-01-01",
            community=self.community_parent, state="Gujarat", city="Ahmedabad",
            contact_phone="9876543210", contact_email="usera@example.com",
            status='Approved', is_verified=True, visibility_type='PRIVATE',
            contact_permission='Approved Interests Only'
        )

        # Create User B (Male)
        self.user_b = User.objects.create_user(username="userb", email="userb@example.com", password="password")
        self.member_b = Member.objects.create(
            user=self.user_b, name="User B", gender="Male", birthdate="1998-01-01", 
            community=self.community_child, state="Gujarat", village="Ahmedabad",
            phone="8765432109", email="userb@example.com", education="Graduate", role="member"
        )
        self.profile_b = MatrimonyProfile.objects.create(
            user=self.user_b, name="User B", gender="Groom", dob="1998-01-01",
            community=self.community_child, state="Gujarat", city="Ahmedabad",
            contact_phone="8765432109", contact_email="userb@example.com",
            status='Approved', is_verified=True, visibility_type='PLATFORM_WIDE'
        )

        # Create User C (Male, Outside Network)
        self.user_c = User.objects.create_user(username="userc", email="userc@example.com", password="password")
        self.member_c = Member.objects.create(
            user=self.user_c, name="User C", gender="Male", birthdate="1997-01-01", 
            community=self.community_outside, state="Maharashtra", village="Mumbai",
            phone="7654321098", email="userc@example.com", education="PostGraduate", role="member"
        )
        self.profile_c = MatrimonyProfile.objects.create(
            user=self.user_c, name="User C", gender="Groom", dob="1997-01-01",
            community=self.community_outside, state="Maharashtra", city="Mumbai",
            contact_phone="7654321098", contact_email="userc@example.com",
            status='Approved', is_verified=True, visibility_type='PLATFORM_WIDE'
        )

    def test_profile_hidden_when_private_before_interest(self):
        from api.rule_engine import MatrimonyRuleEngine
        # User A is Private. User B should not see User A in listings
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_b)
        self.assertFalse(visible)
        self.assertEqual(reason, "Private (Requires Accepted Interest)")

        # Once interest is accepted or sent by Private profile User A:
        from api.models import InterestRequest
        InterestRequest.objects.create(sender=self.profile_a, receiver=self.profile_b, status='Pending')
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_b)
        self.assertTrue(visible)

    def test_community_hierarchy_visibility(self):
        from api.rule_engine import MatrimonyRuleEngine
        # Set Profile A visibility to COMMUNITY ONLY with Child Communities scope
        self.profile_a.visibility_type = 'COMMUNITY_ONLY'
        self.profile_a.hierarchy_scope = 'Child Communities'
        self.profile_a.save()

        # User B (Community Child) can see User A (Community Parent)
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_b)
        self.assertTrue(visible)
        
        # User C (Community Outside) cannot see User A
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_c)
        self.assertFalse(visible)

    def test_targeted_matches_visibility(self):
        from api.rule_engine import MatrimonyRuleEngine
        # Set Profile A to TARGETED MATCHES matching Female, Ahmedabad
        self.profile_a.visibility_type = 'TARGETED MATCHES'
        self.profile_a.target_gender = 'Male'
        self.profile_a.target_cities = 'Ahmedabad'
        self.profile_a.save()

        # User B matches criteria: Male, Ahmedabad -> Should be visible
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_b)
        self.assertTrue(visible)

        # User C matches gender but Mumbai -> Should NOT be visible
        visible, reason = MatrimonyRuleEngine.evaluate_visibility(self.profile_a, self.user_c)
        self.assertFalse(visible)

    def test_visibility_reason_field_inclusion(self):
        from api.serializers import MatrimonyProfileSerializer
        # 1. Active Open To All profile
        self.profile_a.visibility_type = 'OPEN TO ALL'
        self.profile_a.status = 'Approved'
        self.profile_a.save()
        serializer = MatrimonyProfileSerializer(self.profile_a, context={'request': type('MockRequest', (), {'user': self.user_b})()})
        data = serializer.data
        self.assertEqual(data.get('visibility_reason'), 'Open To All')

        # 2. Draft profile
        self.profile_a.status = 'Draft'
        self.profile_a.save()
        serializer = MatrimonyProfileSerializer(self.profile_a, context={'request': type('MockRequest', (), {'user': self.user_b})()})
        data = serializer.data
        self.assertEqual(data.get('visibility_reason'), 'Draft')
        self.assertEqual(data.get('name'), 'Hidden Profile')

        # 3. Inactive profile
        from api.models import MatrimonyProfile
        MatrimonyProfile.objects.filter(id=self.profile_a.id).update(status='Inactive')
        self.profile_a.refresh_from_db()
        serializer = MatrimonyProfileSerializer(self.profile_a, context={'request': type('MockRequest', (), {'user': self.user_b})()})
        data = serializer.data
        self.assertEqual(data.get('visibility_reason'), 'Inactive')

        # 4. Rejected profile
        MatrimonyProfile.objects.filter(id=self.profile_a.id).update(status='Rejected')
        self.profile_a.refresh_from_db()
        serializer = MatrimonyProfileSerializer(self.profile_a, context={'request': type('MockRequest', (), {'user': self.user_b})()})
        data = serializer.data
        self.assertEqual(data.get('visibility_reason'), 'Rejected')

    def test_phase2_four_visibility_modes(self):
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        from api.models import MatrimonyProfile
        
        # 1. PRIVATE Profile
        private_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Private Prof", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='PRIVATE'
        )
        
        # 2. COMMUNITY ONLY Profile
        community_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Community Prof", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='COMMUNITY_ONLY', hierarchy_scope='My Community'
        )
        
        # 3. TARGETED MATCHES Profile
        targeted_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Targeted Prof", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='TARGETED MATCHES', target_gender='Male', target_cities='Ahmedabad'
        )
        
        # 4. OPEN TO ALL Profile
        open_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Open Prof", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='OPEN TO ALL'
        )
        
        # Asserts for Private
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(private_prof, self.user_b))
        
        # Asserts for Community Only
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(community_prof, self.user_b))
        community_prof.hierarchy_scope = 'Child Communities'
        community_prof.save()
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(community_prof, self.user_b))
        
        # Asserts for Targeted Matches
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(targeted_prof, self.user_b))
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(targeted_prof, self.user_c))
        
        # Asserts for Open to All
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(open_prof, self.user_b))
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(open_prof, self.user_c))

    def test_targeted_matches_detailed_cases(self):
        from api.privacy_visibility_engine import PrivacyVisibilityEngine
        from api.models import MatrimonyProfile
        from api.serializers import MatrimonyProfileSerializer
        
        # Test Case 5: Empty Target Rules: Profile should be visible to everyone.
        empty_target_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Empty Target", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='TARGETED MATCHES', target_gender='Everyone'
        )
        # Default age min/max (18/60) are not considered restrictions when other fields are empty.
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(empty_target_prof, self.user_b))
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(empty_target_prof, self.user_c))
        
        # Test Case 1: Target: Bride/Female. Viewer Bride: Visible.
        target_bride_prof = MatrimonyProfile.objects.create(
            user=self.user_b, name="Target Bride", gender="Groom", dob="1995-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='TARGETED MATCHES', target_gender='Bride'
        )
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(target_bride_prof, self.user_a)) # User A is Bride
        
        # Test Case 2: Target: Bride. Viewer Groom: Hidden.
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(target_bride_prof, self.user_c)) # User C is Groom
        
        # Test Case 3: Target: Age 21-28. Viewer 24: Visible. Viewer 35: Hidden.
        target_age_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Target Age", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='TARGETED MATCHES', target_age_min=21, target_age_max=28
        )
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(target_age_prof, self.user_b)) # User B age is 27 (birthdate 1998)
        
        # Modify User C age temporarily to 35
        self.profile_c.dob = "1991-01-01"
        self.profile_c.save()
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(target_age_prof, self.user_c)) # User C age is 35 now
        
        # Test Case 4: Target: Gujarat (State), Ahmedabad (City). Viewer Gujarat, Ahmedabad: Visible. Viewer Gujarat, Surat: Hidden.
        target_loc_prof = MatrimonyProfile.objects.create(
            user=self.user_a, name="Target Location", gender="Bride", dob="2000-01-01",
            community=self.community_parent, status='Approved', is_verified=True,
            visibility_type='TARGETED MATCHES', target_states='Gujarat', target_cities='Ahmedabad'
        )
        # User B is in Gujarat, Ahmedabad -> Visible
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(target_loc_prof, self.user_b))
        
        # Modify User C to Gujarat, Surat
        self.profile_c.state = "Gujarat"
        self.profile_c.city = "Surat"
        self.profile_c.save()
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(target_loc_prof, self.user_c)) # User C in Surat -> Hidden
        
        # Test Case 6: Changing target field must immediately change results.
        target_loc_prof.target_cities = 'Surat'
        target_loc_prof.save()
        # Now User C (Gujarat, Surat) is visible!
        self.assertTrue(PrivacyVisibilityEngine.canDiscoverProfile(target_loc_prof, self.user_c))
        # Now User B (Gujarat, Ahmedabad) is hidden!
        self.assertFalse(PrivacyVisibilityEngine.canDiscoverProfile(target_loc_prof, self.user_b))

        # Test Serializer Response fields inclusion
        serializer = MatrimonyProfileSerializer(target_loc_prof, context={'request': type('MockRequest', (), {'user': self.user_c})()})
        data = serializer.data
        self.assertIn('visibility_passed', data)
        self.assertIn('failed_conditions', data)
        self.assertIn('matched_conditions', data)
        self.assertEqual(data.get('visibility_passed'), True)
        self.assertEqual(data.get('matched_conditions'), ['Age', 'State', 'City'])
        self.assertEqual(data.get('failed_conditions'), [])


class MatrimonyPreferenceEngineTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, MatrimonyProfile, Member
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.community = Community.objects.create(name='Main Community', status='Approved')
        
        self.user_a = User.objects.create_user(username="viewer", password="password")
        self.member_a = Member.objects.create(
            user=self.user_a,
            name="Viewer Member",
            age=26,
            gender="Female",
            email="viewer@example.com",
            phone="9876543211",
            village="Ahmedabad",
            profession="Engineer",
            education="BTech",
            community=self.community,
            status="Active",
            role="member"
        )
        
        self.profile_a = MatrimonyProfile.objects.create(
            user=self.user_a, name="Viewer Profile", gender="Bride", dob="2000-01-01",
            community=self.community, state="Gujarat", city="Ahmedabad", status='Approved', is_verified=True
        )

        # Create a gold plan and subscription so they have MATRIMONY_ACCESS
        from api.models import MemberPremiumPlan, MemberPremiumSubscription
        from django.utils import timezone
        
        plan, _ = MemberPremiumPlan.objects.get_or_create(
            code='gold',
            defaults={
                'name': 'Gold Plan',
                'plan_type': 'gold',
                'status': 'active'
            }
        )
        
        # Ensure features seeded
        from api.views import ensure_features_for_member_plan
        ensure_features_for_member_plan(plan)
        
        MemberPremiumSubscription.objects.create(
            member=self.member_a,
            plan=plan,
            status='active',
            billing_cycle='lifetime',
            start_date=timezone.now()
        )
        
        self.user_b = User.objects.create_user(username="candidate", password="password")
        self.member_b = Member.objects.create(
            user=self.user_b,
            name="Candidate Member",
            age=28,
            gender="Male",
            email="candidate@example.com",
            phone="9876543212",
            village="Ahmedabad",
            profession="Manager",
            education="MBA",
            community=self.community,
            status="Active",
            role="member"
        )
        
        self.profile_b = MatrimonyProfile.objects.create(
            user=self.user_b, name="Candidate Profile", gender="Groom", dob="1998-01-01",
            community=self.community, state="Gujarat", city="Ahmedabad", status='Approved', is_verified=True
        )

    def test_empty_preferences_default(self):
        from api.preference_engine import PreferenceEngine
        res = PreferenceEngine.calculate_compatibility(self.profile_a, self.profile_b)
        self.assertEqual(res['compatibility'], 100)
        self.assertEqual(len(res['failed_hard_rules']), 0)

    def test_validation_constraints(self):
        from api.preference_engine import PreferenceEngine
        from rest_framework.exceptions import ValidationError
        # Min Age > Max Age
        bad_age = {
            'min_age': {'value': 30, 'enabled': True, 'weight': 10, 'mode': 'Soft'},
            'max_age': {'value': 25, 'enabled': True, 'weight': 10, 'mode': 'Soft'}
        }
        with self.assertRaises(ValidationError):
            PreferenceEngine.validate_preferences(bad_age)

        # Negative Income
        bad_income = {
            'income_min': {'value': -50000, 'enabled': True, 'weight': 10, 'mode': 'Soft'},
            'income_max': {'value': 100000, 'enabled': True, 'weight': 10, 'mode': 'Soft'}
        }
        with self.assertRaises(ValidationError):
            PreferenceEngine.validate_preferences(bad_income)

        # Duplicate Communities
        bad_comm = {
            'preferred_community': {'value': [1, 1, 2], 'enabled': True, 'weight': 10, 'mode': 'Soft'}
        }
        with self.assertRaises(ValidationError):
            PreferenceEngine.validate_preferences(bad_comm)

        # Height Min > Height Max
        bad_height = {
            'height_min': {'value': "5 ft 8 in", 'enabled': True, 'weight': 10, 'mode': 'Soft'},
            'height_max': {'value': "5 ft 4 in", 'enabled': True, 'weight': 10, 'mode': 'Soft'}
        }
        with self.assertRaises(ValidationError):
            PreferenceEngine.validate_preferences(bad_height)

        # Invalid Gender
        bad_gender = {
            'preferred_gender': {'value': "Invalid", 'enabled': True, 'weight': 100, 'mode': 'Hard'}
        }
        with self.assertRaises(ValidationError):
            PreferenceEngine.validate_preferences(bad_gender)

    def test_save_and_load_preferences(self):
        from api.preference_engine import PreferenceEngine
        pref_data = {
            'preferred_gender': {'value': 'Groom', 'enabled': True, 'weight': 100, 'mode': 'Hard'},
            'min_age': {'value': 22, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
            'max_age': {'value': 32, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
        }
        PreferenceEngine.save_preferences(self.profile_a.id, pref_data)
        
        # Load and verify
        loaded = PreferenceEngine.load_preferences(self.profile_a.id)
        self.assertEqual(loaded['preferred_gender']['value'], 'Groom')
        self.assertEqual(loaded['preferred_gender']['mode'], 'Hard')
        
        # Verify db columns sync (backward compatibility)
        pref = self.profile_a.partner_preference
        self.assertEqual(pref.gender, 'Groom')
        self.assertEqual(pref.min_age, 22)
        self.assertEqual(pref.max_age, 32)

    def test_hard_filter_failure_results_in_zero_compatibility(self):
        from api.preference_engine import PreferenceEngine
        pref_data = {
            # Candidate is Groom, viewer wants Bride (Hard filter)
            'preferred_gender': {'value': 'Bride', 'enabled': True, 'weight': 100, 'mode': 'Hard'},
            # Candidate is 28 (birthdate 1998), matching the age range
            'min_age': {'value': 20, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
            'max_age': {'value': 30, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
        }
        PreferenceEngine.save_preferences(self.profile_a.id, pref_data)
        res = PreferenceEngine.calculate_compatibility(self.profile_a, self.profile_b)
        self.assertEqual(res['compatibility'], 0)
        self.assertIn('Preferred Gender', res['failed_hard_rules'])
        self.assertIn('Min Age', res['matched_fields'])

    def test_soft_filter_calculations(self):
        from api.preference_engine import PreferenceEngine
        pref_data = {
            'preferred_gender': {'value': 'Groom', 'enabled': True, 'weight': 100, 'mode': 'Soft'}, # Match (weight 100)
            'min_age': {'value': 20, 'enabled': True, 'weight': 20, 'mode': 'Soft'}, # Match (weight 20)
            'max_age': {'value': 25, 'enabled': True, 'weight': 20, 'mode': 'Soft'}, # Fail (weight 20) - candidate is 28
        }
        PreferenceEngine.save_preferences(self.profile_a.id, pref_data)
        res = PreferenceEngine.calculate_compatibility(self.profile_a, self.profile_b)
        # Expected score: 100 (gender) + 20 (min_age) = 120
        # Max score: 100 + 20 + 20 = 140
        # Compatibility = 120 / 140 = 85.7% -> 85
        self.assertEqual(res['compatibility'], 85)
        self.assertIn('Preferred Gender', res['matched_fields'])
        self.assertIn('Min Age', res['matched_fields'])
        self.assertIn('Max Age', res['unmatched_fields'])

    def test_api_compatibility_and_validation(self):
        # Authenticate A
        self.client.force_authenticate(self.user_a)
        
        # Test Validate endpoint
        bad_payload = {
            'min_age': {'value': 30, 'enabled': True, 'weight': 10, 'mode': 'Soft'},
            'max_age': {'value': 25, 'enabled': True, 'weight': 10, 'mode': 'Soft'}
        }
        response = self.client.post('/api/matrimony-profiles/preferences/validate/', bad_payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['valid'], False)
        
        # Test Save Preferences via api
        pref_data = {
            'preferred_gender': {'value': 'Groom', 'enabled': True, 'weight': 100, 'mode': 'Hard'},
            'min_age': {'value': 20, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
            'max_age': {'value': 30, 'enabled': True, 'weight': 20, 'mode': 'Soft'},
        }
        # In DRF, we POST preferences_data inside a larger object or send partial PATCH
        response = self.client.patch('/api/matrimony-profiles/preferences/', {'preferences_data': pref_data}, format='json')
        self.assertEqual(response.status_code, 200)
        
        # Test Compatibility endpoint
        response = self.client.get(f'/api/matrimony-profiles/{self.profile_b.id}/compatibility/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['compatibility'], 100)
        self.assertIn('Preferred Gender', data['matched_fields'])
        self.assertIn('Min Age', data['matched_fields'])
        self.assertIn('Max Age', data['matched_fields'])


class ApplicationModuleTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.user = User.objects.create_superuser(username='admin_test', email='admin_test@samaj.org', password='password123')
        self.client.force_login(self.user)

    def test_module_creation_and_sync(self):
        from api.models import ApplicationModule, ApplicationAction, FeatureMaster
        ApplicationAction.objects.get_or_create(name="VIEW")
        ApplicationAction.objects.get_or_create(name="CREATE")

        module = ApplicationModule.objects.create(
            module_code="hrms",
            display_name="HRMS",
            category="Custom",
            route="/dashboard/hrms",
            sort_order=99,
            is_active=True
        )

        feature = FeatureMaster.objects.filter(code="hrms").first()
        self.assertIsNotNone(feature)
        self.assertEqual(feature.name, "HRMS")
        self.assertTrue(feature.active)

        response = self.client.post('/api/modules/', {
            'module_code': 'hrms_api',
            'display_name': 'HRMS API',
            'category': 'Custom',
            'route': '/dashboard/hrms-api',
            'sort_order': 100,
            'is_active': True
        })
        self.assertEqual(response.status_code, 201)
        created_mod = ApplicationModule.objects.get(module_code='hrms_api')
        self.assertTrue(created_mod.module_actions.exists())

    def test_system_module_deletion_blocked(self):
        from api.models import ApplicationModule
        module = ApplicationModule.objects.create(
            module_code="sys_mod",
            display_name="System Mod",
            route="/dashboard/sys",
            sort_order=101,
            is_system=True,
            is_active=True
        )
        response = self.client.delete(f'/api/modules/{module.id}/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Cannot delete system modules', response.json()['error'])

    def test_module_cloning(self):
        from api.models import ApplicationModule, ApplicationAction, ModuleAction
        module = ApplicationModule.objects.create(
            module_code="original",
            display_name="Original Module",
            route="/dashboard/original",
            sort_order=102,
            is_active=True
        )
        action, _ = ApplicationAction.objects.get_or_create(name="VIEW")
        ModuleAction.objects.create(module=module, action=action)

        response = self.client.post(f'/api/modules/{module.id}/clone/')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('Original Module (Copy)', data['display_name'])
        
        cloned_mod = ApplicationModule.objects.get(id=data['id'])
        self.assertTrue(cloned_mod.module_actions.filter(action=action).exists())

    def test_module_bulk_actions(self):
        from api.models import ApplicationModule
        m1 = ApplicationModule.objects.create(
            module_code="b1",
            display_name="B1",
            route="/dashboard/b1",
            sort_order=103,
            is_active=False
        )
        m2 = ApplicationModule.objects.create(
            module_code="b2",
            display_name="B2",
            route="/dashboard/b2",
            sort_order=104,
            is_active=False
        )
        import json
        response = self.client.post('/api/modules/bulk-activate/', json.dumps({'ids': [m1.id, m2.id]}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(ApplicationModule.objects.get(id=m1.id).is_active)
        self.assertTrue(ApplicationModule.objects.get(id=m2.id).is_active)

    def test_scan_and_discover(self):
        from api.models import ApplicationModule
        response = self.client.post('/api/modules/scan/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(ApplicationModule.objects.count() > 0)


class CommunitySubscriptionManagementTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, Member, SubscriptionPlan, CommunitySubscription, FeatureUsage, PlanAddon
        from rest_framework.test import APIClient
        
        self.client = APIClient()
        self.super_user = User.objects.create_superuser(username='superadmin', password='password123')
        self.admin_user = User.objects.create_user(username='commadmin', password='password123')
        
        self.community = Community.objects.create(name='Test Samaj', status='Approved')
        self.admin_member = Member.objects.create(
            user=self.admin_user,
            name='Test Admin',
            age=30,
            gender='Male',
            email='admin@testsamaj.org',
            phone='9999990000',
            village='Rajkot',
            profession='Business',
            education='MBA',
            community=self.community,
            status='Active',
            role='community_admin'
        )
        
        # Ensure plans seeded
        from api.views import ensure_plans_seeded
        ensure_plans_seeded()
        
        self.free_plan = SubscriptionPlan.objects.get(code='free')
        self.basic_plan = SubscriptionPlan.objects.get(code='basic')
        self.addon = PlanAddon.objects.create(
            name="Extra 100 Members",
            code="addon_100_members",
            price=299.00,
            limit_type="members",
            limit_value=100,
            description="Add 100 members limit"
        )

    def test_plan_assignment_and_limit_enforcement(self):
        # 1. Assign Free plan
        self.client.force_authenticate(self.super_user)
        response = self.client.post('/api/community-subscriptions/assign/', {
            'community_id': self.community.id,
            'plan_id': self.free_plan.id,
            'billing_cycle': 'Monthly',
            'price_paid': 0
        })
        self.assertEqual(response.status_code, 200)
        
        # 2. Check limits initialized
        from api.models import FeatureUsage, Member
        fu = FeatureUsage.objects.get(community=self.community, metric='members')
        self.assertEqual(fu.max_limit, 50)
        
        # 3. Add members up to limit (50)
        # Note: the setup has 1 member (admin). Let's mock create 49 members.
        from django.contrib.auth.models import User
        for i in range(49):
            user = User.objects.create_user(username=f'user_{i}', password='password123')
            Member.objects.create(
                user=user,
                name=f'User {i}',
                age=25,
                gender='Male',
                email=f'user_{i}@test.com',
                phone=f'99999911{i:02d}',
                village='Rajkot',
                profession='Engineer',
                education='BTech',
                community=self.community,
                status='Active'
            )
            
        # Verify 50 members exist
        self.assertEqual(Member.objects.filter(community=self.community).count(), 50)
        
        # 4. Attempt to add 51st member should fail when calling backend check-access or creation check
        # Let's verify check_access ViewSet action returns access false
        self.client.force_authenticate(self.admin_user)
        response = self.client.get('/api/community-subscriptions/check-access/', {
            'community_id': self.community.id,
            'module': 'members',
            'action': 'create'
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['has_access'])

    def test_addon_purchase_increases_limit(self):
        # 1. Assign Free plan
        self.client.force_authenticate(self.super_user)
        self.client.post('/api/community-subscriptions/assign/', {
            'community_id': self.community.id,
            'plan_id': self.free_plan.id,
            'billing_cycle': 'Monthly',
            'price_paid': 0
        })
        
        # 2. Purchase addon
        self.client.force_authenticate(self.admin_user)
        response = self.client.post('/api/plan-addons/purchase/', {
            'addon_id': self.addon.id,
            'quantity': 1,
            'community_id': self.community.id
        })
        self.assertEqual(response.status_code, 200)
        
        # 3. Verify limit has increased to 150 (50 + 100)
        from api.models import FeatureUsage
        fu = FeatureUsage.objects.get(community=self.community, metric='members')
        self.assertEqual(fu.max_limit, 150)

    def test_coupon_validation(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.post('/api/plans/validate-coupon/', {
            'code': 'SAAS50'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['valid'])
        self.assertEqual(response.json()['discount_percentage'], 50)

    def test_audit_logging_on_change(self):
        self.client.force_authenticate(self.super_user)
        self.client.post('/api/community-subscriptions/assign/', {
            'community_id': self.community.id,
            'plan_id': self.free_plan.id,
            'billing_cycle': 'Monthly',
            'price_paid': 0
        })
        
        from api.models import SubscriptionAuditLog
        logs = SubscriptionAuditLog.objects.filter(community=self.community, field_name='plan')
        self.assertTrue(logs.exists())
        self.assertEqual(logs.first().new_value, 'Free')


class MemberPremiumManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        from django.contrib.auth.models import User
        from api.models import Community, Member, MemberPremiumPlan, MemberPremiumAddon, MemberPremiumCoupon
        
        self.super_user = User.objects.create_superuser(username='super', password='password123')
        self.user = User.objects.create_user(username='member1', password='password123')
        self.other_user = User.objects.create_user(username='member2', password='password123')
        
        self.community = Community.objects.create(name='Matrimony Samaj', status='Approved')
        
        self.member = Member.objects.create(
            user=self.user,
            name='Prem Kumar',
            age=28,
            gender='Male',
            email='prem@test.com',
            phone='9876543210',
            village='Rajkot',
            profession='Software Developer',
            education='BTech',
            community=self.community,
            status='Active'
        )
        
        self.other_member = Member.objects.create(
            user=self.other_user,
            name='Rajesh Kumar',
            age=30,
            gender='Male',
            email='rajesh@test.com',
            phone='9876543211',
            village='Surat',
            profession='Business owner',
            education='MBA',
            community=self.community,
            status='Active'
        )
        
        self.free_plan = MemberPremiumPlan.objects.create(
            name='Free Plan',
            code='free',
            plan_type='free',
            monthly_price=0,
            yearly_price=0,
            status='active'
        )
        
        self.gold_plan = MemberPremiumPlan.objects.create(
            name='Gold Plan',
            code='gold',
            plan_type='gold',
            monthly_price=499,
            yearly_price=4999,
            status='active'
        )
        
        self.addon = MemberPremiumAddon.objects.create(
            name='Extra AI Credits',
            code='ADD_AI_CREDITS',
            price=99,
            active=True
        )
        
        self.coupon = MemberPremiumCoupon.objects.create(
            code='PREM50',
            name='50% Discount',
            coupon_type='percentage',
            discount_value=50,
            is_active=True
        )

    def test_my_membership_overview(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/member-premium-subscriptions/my-membership/')
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertEqual(json_data['plan_code'], 'free')
        self.assertEqual(json_data['status'], 'active')
        self.assertIn('rewards', json_data)
        self.assertIn('tickets', json_data)
        self.assertIn('all_plans', json_data)

    def test_addon_purchase(self):
        self.client.force_authenticate(self.user)
        # Ensure free sub auto-created first
        self.client.get('/api/member-premium-subscriptions/my-membership/')
        
        response = self.client.post(f'/api/member-premium-addons/{self.addon.id}/purchase/', {
            'quantity': 2,
            'payment_method': 'Razorpay'
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['quantity'], 2)
        
        # Verify transaction and invoices created
        response_tx = self.client.get('/api/member-premium-transactions/')
        self.assertEqual(response_tx.status_code, 200)
        self.assertTrue(len(response_tx.json()) > 0)
        
        response_inv = self.client.get('/api/member-premium-invoices/')
        self.assertEqual(response_inv.status_code, 200)
        self.assertTrue(len(response_inv.json()) > 0)

    def test_coupon_validation(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/member-premium-coupons/validate/', {
            'code': 'PREM50',
            'amount': 499
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['valid'])
        self.assertEqual(response.json()['discount_amount'], 249.5)

    def test_plan_upgrade_and_renewal(self):
        self.client.force_authenticate(self.user)
        # Initial call creates free sub
        self.client.get('/api/member-premium-subscriptions/my-membership/')
        
        from api.models import MemberPremiumSubscription
        sub = MemberPremiumSubscription.objects.get(member=self.member)
        
        # 1. Upgrade to Gold
        response = self.client.post(f'/api/member-premium-subscriptions/{sub.id}/upgrade/', {
            'plan_id': self.gold_plan.id
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['plan_code'], 'gold')
        
        # 2. Renew subscription
        response_ren = self.client.post(f'/api/member-premium-subscriptions/{sub.id}/renew/', {
            'billing_cycle': 'monthly',
            'payment_method': 'Stripe'
        })
        self.assertEqual(response_ren.status_code, 200)

    def test_feature_access_checks(self):
        self.client.force_authenticate(self.user)
        # Ensure free sub auto-created and features seeded first
        self.client.get('/api/member-premium-subscriptions/my-membership/')
        
        # Upgrade to Gold plan so that MESSAGES_ACCESS is True
        from api.models import MemberPremiumSubscription
        sub = MemberPremiumSubscription.objects.get(member=self.member)
        sub.plan = self.gold_plan
        sub.save()
        
        # Let's verify check-feature endpoint
        response = self.client.post('/api/member-premium-subscriptions/check-feature/', {
            'member_id': self.member.id,
            'feature_code': 'UNLIMITED_CHAT'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['has_access'])

    def test_security_role_based_access(self):
        # 1. Create a ticket for user 1
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/member-premium-tickets/', {
            'subject': 'Help with payment',
            'description': 'It failed'
        })
        self.assertEqual(response.status_code, 201)
        ticket_id = response.json()['id']
        
        # 2. User 2 should NOT be able to view User 1's tickets
        self.client.force_authenticate(self.other_user)
        response_other = self.client.get('/api/member-premium-tickets/')
        self.assertEqual(response_other.status_code, 200)
        # Should be empty because other_user has no tickets
        self.assertEqual(len(response_other.json()), 0)
        
        # 3. Direct access to user 1's ticket details by user 2 should be restricted
        response_det = self.client.get(f'/api/member-premium-tickets/{ticket_id}/')
        # Since it uses default ModelViewSet with custom get_queryset, requesting other's detail returns 404 (Not found)!
        self.assertEqual(response_det.status_code, 404)


class CommunitySubscriptionCenterTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, Member
        self.client = APIClient()
        self.community = Community.objects.create(name='Surat Samaj', status='Approved')
        self.user = User.objects.create_user(username='surat_admin', password='pass')
        self.member = Member.objects.create(
            user=self.user,
            name='Surat Admin',
            age=32,
            gender='Male',
            email='surat@example.com',
            phone='9999999999',
            village='Surat',
            profession='Business',
            education='BCom',
            community=self.community,
            status='Active',
            role='community_admin',
        )
        self.client.force_authenticate(self.user)

    def test_ensure_plans_seeded_and_get_my_plan(self):
        # Trigger get_my_plan view
        response = self.client.get('/api/community-subscriptions/my-plan/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('header', data)
        self.assertIn('usage', data)
        self.assertIn('features', data)
        self.assertEqual(data['header']['community_name'], 'Surat Samaj')

    def test_list_addons(self):
        response = self.client.get('/api/plan-addons/')
        self.assertEqual(response.status_code, 200)

    def test_list_audit_logs(self):
        response = self.client.get('/api/subscription-audit-logs/')
        self.assertEqual(response.status_code, 200)


class MemberPremiumPlanAPITests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.client = APIClient()
        self.user = User.objects.create_superuser(username='superadmin', password='password123')
        self.client.force_authenticate(self.user)

    def test_create_and_update_plan_with_features_and_benefits(self):
        payload = {
            "name": "Diamond Premium Plan",
            "code": "diamond_test",
            "plan_type": "diamond",
            "short_description": "Test Diamond description",
            "description": "Long test description",
            "color_theme": "#EA580C",
            "icon": "Crown",
            "monthly_price": 999.00,
            "currency": "INR",
            "gst_percentage": 18.00,
            "status": "active",
            "features": [
                {
                    "feature_code": "MATRIMONY_UNLIMITED_VIEWS",
                    "name": "Unlimited Profile Views",
                    "description": "No limit on profile views",
                    "category": "matrimony",
                    "is_enabled": True,
                    "limit_type": "unlimited",
                    "limit_value": 0,
                    "priority": 1,
                    "upgrade_message": "Upgrade to unlock"
                },
                {
                    "feature_code": "BUSINESS_PROMOTIONS",
                    "name": "Business Promotions",
                    "description": "Promote your business on WAG Hub",
                    "category": "business",
                    "is_enabled": True,
                    "limit_type": "unlimited",
                    "limit_value": 0,
                    "priority": 2,
                    "upgrade_message": "Upgrade to unlock"
                }
            ],
            "benefits": [
                {
                    "title": "VIP Support",
                    "description": "Priority support channel",
                    "icon": "check",
                    "is_highlight": True,
                    "display_order": 1,
                    "is_included": True
                }
            ]
        }

        # Create
        response = self.client.post('/api/member-premium-plans/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['code'], "diamond_test")
        plan_id = data['id']

        # Verify created features in the DB
        from api.models import MemberPremiumFeature, MemberPremiumBenefit
        self.assertEqual(MemberPremiumFeature.objects.filter(plan_id=plan_id).count(), 2)
        self.assertEqual(MemberPremiumBenefit.objects.filter(plan_id=plan_id).count(), 1)

        # Update (PATCH)
        update_payload = {
            "name": "Diamond Premium Plan Updated",
            "features": [
                {
                    "feature_code": "MATRIMONY_UNLIMITED_VIEWS",
                    "name": "Unlimited Profile Views (Updated)",
                    "description": "Updated description",
                    "category": "matrimony",
                    "is_enabled": True,
                    "limit_type": "unlimited",
                    "limit_value": 0,
                    "priority": 1,
                    "upgrade_message": "Upgrade to unlock"
                }
            ],
            "benefits": []
        }
        response = self.client.patch(f'/api/member-premium-plans/{plan_id}/', update_payload, format='json')
        self.assertEqual(response.status_code, 200)

        # Verify features were synced (one was removed)
        self.assertEqual(MemberPremiumFeature.objects.filter(plan_id=plan_id).count(), 1)
        self.assertEqual(MemberPremiumBenefit.objects.filter(plan_id=plan_id).count(), 0)


class MemberPremiumPermissionEnforcementTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, Member, MemberPremiumPlan, MemberPremiumSubscription, MemberPremiumFeature, PremiumFeatureRegistry
        from api.views import DEFAULT_REGISTRY_FEATURES
        self.client = APIClient()

        # Seed premium feature registry
        for module, name, code, desc, cat, icon in DEFAULT_REGISTRY_FEATURES:
            PremiumFeatureRegistry.objects.get_or_create(
                feature_code=code,
                defaults={
                    'module': module,
                    'feature_name': name,
                    'description': desc,
                    'category': cat,
                    'icon': icon,
                    'status': 'active'
                }
            )

        self.community = Community.objects.create(name='Permission Test Community', status='Approved')

        # Admin User (community_admin bypasses MemberPremiumModulePermission)
        self.admin_user = User.objects.create_superuser(username='perm_admin', password='password123')
        self.admin_member = Member.objects.create(
            user=self.admin_user,
            name='Admin User',
            age=35,
            gender='Male',
            email='admin@permtest.com',
            phone='9876543200',
            village='Rajkot',
            profession='Business',
            education='MBA',
            community=self.community,
            status='Active',
            role='super_admin'
        )

        # Regular Member User (gated by plans)
        self.member_user = User.objects.create_user(username='perm_member', password='password123')
        self.member = Member.objects.create(
            user=self.member_user,
            name='Regular Member',
            age=28,
            gender='Male',
            email='member@permtest.com',
            phone='9876543201',
            village='Rajkot',
            profession='Developer',
            education='BTech',
            community=self.community,
            status='Active',
            role='member'
        )

        # Free Plan
        self.free_plan = MemberPremiumPlan.objects.create(
            name='Free Plan',
            code='free',
            plan_type='free',
            monthly_price=0,
            status='active'
        )

        # Premium Plan with venue + donation features
        self.premium_plan = MemberPremiumPlan.objects.create(
            name='Premium Plan',
            code='premium',
            plan_type='premium',
            monthly_price=299,
            status='active'
        )
        MemberPremiumFeature.objects.create(
            plan=self.premium_plan,
            feature_code='VENUE_BOOKING_ENABLED',
            name='Venue Booking Access',
            category='property',
            is_enabled=True,
            limit_type='unlimited'
        )
        MemberPremiumFeature.objects.create(
            plan=self.premium_plan,
            feature_code='DONATIONS_ENABLED',
            name='Donations Access',
            category='donations',
            is_enabled=True,
            limit_type='unlimited'
        )

        # Assign free subscription to regular member
        self.sub = MemberPremiumSubscription.objects.create(
            member=self.member,
            plan=self.free_plan,
            status='active',
            billing_cycle='lifetime',
            auto_renew=True
        )

    def test_admin_bypass_permissions(self):
        """Superusers must have full access to all gated endpoints."""
        self.client.force_authenticate(self.admin_user)
        for url in ['/api/campaigns/', '/api/donations/', '/api/advertisements/', '/api/venue-bookings/']:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, msg=f"Admin got {response.status_code} on {url}")

    def test_regular_member_restricted_on_free_tier(self):
        """Regular members on free plan must be blocked (403) from premium-gated endpoints."""
        self.client.force_authenticate(self.member_user)
        response = self.client.get('/api/venue-bookings/')
        self.assertEqual(response.status_code, 403)
        detail = response.json().get('detail', '')
        if isinstance(detail, dict):
            detail = detail.get('detail', '')
        self.assertIn('restricted', str(detail).lower())

    def test_regular_member_allowed_on_premium_tier(self):
        """Regular members upgraded to premium must have full access."""
        self.sub.plan = self.premium_plan
        self.sub.save()
        self.client.force_authenticate(self.member_user)
        response = self.client.get('/api/venue-bookings/')
        self.assertEqual(response.status_code, 200)
        response = self.client.get('/api/campaigns/')
        self.assertEqual(response.status_code, 200)


class MemberSubscriptionAccessControlTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from api.models import Community, Member, MemberPremiumPlan, MemberPremiumSubscription, ApplicationModule
        self.client = APIClient()

        self.community = Community.objects.create(name='Test Access Community', status='Approved')
        self.user = User.objects.create_user(username='test_access_member', password='password123')
        self.member = Member.objects.create(
            user=self.user,
            name='Test Access Member',
            age=25,
            gender='Male',
            email='testaccess@test.com',
            phone='9876543202',
            village='Rajkot',
            profession='Developer',
            education='BTech',
            community=self.community,
            status='Active',
            role='member'
        )

        self.free_plan = MemberPremiumPlan.objects.create(
            name='Free Plan',
            code='free',
            plan_type='free',
            monthly_price=0,
            status='active'
        )

        self.custom_plan = MemberPremiumPlan.objects.create(
            name='Custom Admin Plan',
            code='custom_admin_plan',
            plan_type='custom',
            monthly_price=199,
            status='active'
        )

        # Initialize only one feature for the custom plan to simulate admin save payload
        from api.models import MemberPremiumFeature
        MemberPremiumFeature.objects.create(
            plan=self.custom_plan,
            feature_code='MATRIMONY_ACCESS',
            name='Matrimony Access',
            category='matrimony',
            is_enabled=True
        )

        self.sub = MemberPremiumSubscription.objects.create(
            member=self.member,
            plan=self.free_plan,
            status='active',
            billing_cycle='lifetime'
        )

        # Create modules for testing sidebar locking
        self.dashboard_mod = ApplicationModule.objects.create(
            module_code='dashboard',
            display_name='Dashboard',
            route='/dashboard',
            sort_order=1,
            is_active=True,
            is_sidebar_module=True
        )
        self.sub_mod = ApplicationModule.objects.create(
            module_code='subscription',
            display_name='My Subscription',
            route='/dashboard/subscription',
            sort_order=2,
            is_active=True,
            is_sidebar_module=True
        )
        self.matrimony_mod = ApplicationModule.objects.create(
            module_code='matrimony',
            display_name='Matrimony',
            route='/dashboard/matrimony',
            sort_order=3,
            is_active=True,
            is_sidebar_module=True
        )
        self.family_mod = ApplicationModule.objects.create(
            module_code='family',
            display_name='My Family',
            route='/dashboard/family',
            sort_order=4,
            is_active=True,
            is_sidebar_module=True
        )

    def test_ensure_features_for_member_plan_preserves_custom_selections(self):
        from api.views import ensure_features_for_member_plan
        from api.models import MemberPremiumFeature

        # Call ensure_features_for_member_plan on custom plan
        ensure_features_for_member_plan(self.custom_plan)

        # Matrimony Access should remain enabled
        matrimony_feature = MemberPremiumFeature.objects.get(plan=self.custom_plan, feature_code='MATRIMONY_ACCESS')
        self.assertTrue(matrimony_feature.is_enabled)

        # Messages Access (which was not explicitly added) should be created but disabled (is_enabled=False)
        messages_feature = MemberPremiumFeature.objects.get(plan=self.custom_plan, feature_code='MESSAGES_ACCESS')
        self.assertFalse(messages_feature.is_enabled)

    def test_sidebar_locking_for_free_plan(self):
        from api.serializers import ApplicationModuleSerializer
        self.client.force_authenticate(self.user)

        # Verify locked states using Serializer context
        req = self.client.get('/api/modules/sidebar/')
        self.assertEqual(req.status_code, 200)
        
        # Parse serializer-based sidebar data
        sidebar_modules = req.json()
        dashboard_item = next(item for item in sidebar_modules if item['module_code'] == 'dashboard')
        sub_item = next(item for item in sidebar_modules if item['module_code'] == 'subscription')
        matrimony_item = next(item for item in sidebar_modules if item['module_code'] == 'matrimony')
        family_item = next(item for item in sidebar_modules if item['module_code'] == 'family')

        # Dashboard and Subscription must NOT be locked
        self.assertFalse(dashboard_item['locked'])
        self.assertFalse(sub_item['locked'])

        # Matrimony and Family must BE locked
        self.assertTrue(matrimony_item['locked'])
        self.assertTrue(family_item['locked'])



