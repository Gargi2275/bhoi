import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import (
    Community, Member, Committee, Event, Job,
    Business, MatrimonyProfile, Campaign, Donation,
    News, Family, FamilyMember
)

class Command(BaseCommand):
    help = 'Seeds the database with mock data matching the frontend'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        FamilyMember.objects.all().delete()
        Family.objects.all().delete()
        Donation.objects.all().delete()
        Campaign.objects.all().delete()
        MatrimonyProfile.objects.all().delete()
        Business.objects.all().delete()
        Job.objects.all().delete()
        Event.objects.all().delete()
        Committee.objects.all().delete()
        News.objects.all().delete()
        Member.objects.all().delete()
        Community.objects.all().delete()
        
        # Keep superuser but delete other users
        User.objects.exclude(is_superuser=True).delete()
        
        self.stdout.write('Seeding data...')
        
        # 1. Create Superuser if not exists
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser('admin', 'admin@weareunited.in', 'admin123')
            self.stdout.write('Superuser "admin" with password "admin123" created.')
        else:
            admin_user = User.objects.get(username='admin')
            admin_user.email = 'admin@weareunited.in'
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('Superuser "admin" password reset to "admin123" and email updated.')

        # Mock image url helper
        def u(img_id, w=400, h=400):
            return f"https://images.unsplash.com/photo-{img_id}?w={w}&h={h}&fit=crop&auto=format"

        # 2. Communities
        communities_data = [
            { "id_str": "c1", "name": "Rampara Ahir Samaj", "type": "Subsidiary", "parent_name": "Rajula Samaj Mandal", "state": "Gujarat", "district": "Amreli", "taluka": "Rajula", "village": "Rampara", "plan": "Pro", "status": "Active", "logo_url": u("1532635241-17e820acc59f", 200, 200), "cover_url": u("1532375810709-75b1da00537c", 800, 400), "gradient": "from-blue-600 to-indigo-700", "desc": "A vibrant Ahir community based in Rampara village serving 1240+ members across Gujarat." },
            { "id_str": "c2", "name": "Rajula Samaj Mandal", "type": "Super", "parent_name": None, "state": "Gujarat", "district": "Amreli", "taluka": "Rajula", "village": "Rajula", "plan": "Enterprise", "status": "Active", "logo_url": u("1599566150163-29194dcaad36", 200, 200), "cover_url": u("1524492412937-b28074a5d7da", 800, 400), "gradient": "from-amber-500 to-orange-600", "desc": "Apex community of Rajula taluka uniting 22 subsidiary samaj groups." },
            { "id_str": "c3", "name": "Surat Patidar Society", "type": "Super", "parent_name": None, "state": "Gujarat", "district": "Surat", "taluka": "Surat City", "village": "Adajan", "plan": "Enterprise", "status": "Active", "logo_url": u("1568602471122-7832951cc4c5", 200, 200), "cover_url": u("1517248135467-4c7edcad34c4", 800, 400), "gradient": "from-emerald-600 to-teal-700", "desc": "Leading Patidar association in Surat with chapters across the world." },
            { "id_str": "c4", "name": "Mumbai Maheshwari Sangh", "type": "Super", "parent_name": None, "state": "Maharashtra", "district": "Mumbai", "taluka": "Andheri", "village": "Andheri West", "plan": "Pro", "status": "Active", "logo_url": u("1438761681033-6461ffad8d80", 200, 200), "cover_url": u("1514222709107-a180c68d72b4", 800, 400), "gradient": "from-rose-500 to-pink-700", "desc": "Maheshwari community organisation serving Mumbai metropolitan region." },
            { "id_str": "c5", "name": "Pune Marathi Mandal", "type": "Super", "parent_name": None, "state": "Maharashtra", "district": "Pune", "taluka": "Pune City", "village": "Kothrud", "plan": "Basic", "status": "Active", "logo_url": u("1547425260-76bcadfb4f2c", 200, 200), "cover_url": u("1561361513-2d000a50f0dc", 800, 400), "gradient": "from-violet-600 to-purple-700", "desc": "Cultural and social hub for Marathi families in Pune." },
            { "id_str": "c6", "name": "Jaipur Marwari Sabha", "type": "Super", "parent_name": None, "state": "Rajasthan", "district": "Jaipur", "taluka": "Jaipur City", "village": "Mansarovar", "plan": "Pro", "status": "Active", "logo_url": u("1564564321837-a57b7070ac4f", 200, 200), "cover_url": u("1599661046289-e31897846e41", 800, 400), "gradient": "from-yellow-500 to-amber-700", "desc": "Marwari business community sabha headquartered in Jaipur." },
            { "id_str": "c7", "name": "Bangalore Kannada Koota", "type": "Super", "parent_name": None, "state": "Karnataka", "district": "Bengaluru", "taluka": "Bangalore Urban", "village": "Jayanagar", "plan": "Basic", "status": "Active", "logo_url": u("1581291518857-4e27b48ff24e", 200, 200), "cover_url": u("1466442929976-97f336a657be", 800, 400), "gradient": "from-red-500 to-rose-700", "desc": "Promoting Kannada language and culture in tech capital." },
            { "id_str": "c8", "name": "Chennai Iyengar Sabha", "type": "Super", "parent_name": None, "state": "Tamil Nadu", "district": "Chennai", "taluka": "Mylapore", "village": "Mylapore", "plan": "Basic", "status": "Active", "logo_url": u("1572252009286-268acec5ca0a", 200, 200), "cover_url": u("1545194445-dddb8f4487c6", 800, 400), "gradient": "from-orange-500 to-red-600", "desc": "Traditional Iyengar community organization in Chennai." },
            { "id_str": "c9", "name": "Bhuj Kutchi Leva Patel", "type": "Subsidiary", "parent_name": "Kutch Patidar Samaj", "state": "Gujarat", "district": "Kutch", "taluka": "Bhuj", "village": "Bhuj City", "plan": "Basic", "status": "Active", "logo_url": u("1531256456869-ce942a665e80", 200, 200), "cover_url": u("1532375810709-75b1da00537c", 800, 400), "gradient": "from-sky-500 to-blue-700", "desc": "Leva Patel community of Bhuj region." },
            { "id_str": "c10", "name": "Kutch Patidar Samaj", "type": "Super", "parent_name": None, "state": "Gujarat", "district": "Kutch", "taluka": "Bhuj", "village": "Bhuj", "plan": "Pro", "status": "Active", "logo_url": u("1531123897727-8f129e1688ce", 200, 200), "cover_url": u("1469854523086-cc02fe5d8800", 800, 400), "gradient": "from-teal-500 to-cyan-700", "desc": "Umbrella body for all Patidar samaj groups in Kutch." },
            { "id_str": "c11", "name": "Ahmedabad Brahmin Samaj", "type": "Super", "parent_name": None, "state": "Gujarat", "district": "Ahmedabad", "taluka": "Ahmedabad City", "village": "Navrangpura", "plan": "Pro", "status": "Active", "logo_url": u("1507003211169-0a1dd7228f2d", 200, 200), "cover_url": u("1543341724-66ca0d39b133", 800, 400), "gradient": "from-indigo-600 to-blue-800", "desc": "Brahmin community samaj of Ahmedabad city." },
            { "id_str": "c12", "name": "Vadodara Jain Sangh", "type": "Super", "parent_name": None, "state": "Gujarat", "district": "Vadodara", "taluka": "Vadodara City", "village": "Alkapuri", "plan": "Basic", "status": "Pending", "logo_url": u("1633332755192-727a05c4013d", 200, 200), "cover_url": u("1499951360447-b19be8fe80f5", 800, 400), "gradient": "from-fuchsia-500 to-purple-700", "desc": "Jain community organisation of Vadodara." },
            { "id_str": "c13", "name": "Delhi Punjabi Biradari", "type": "Super", "parent_name": None, "state": "Delhi", "district": "New Delhi", "taluka": "South Delhi", "village": "Greater Kailash", "plan": "Enterprise", "status": "Active", "logo_url": u("1500648767791-00dcc994a43e", 200, 200), "cover_url": u("1587474260584-136574528ed5", 800, 400), "gradient": "from-lime-500 to-green-700", "desc": "Punjabi community network across NCR region." },
            { "id_str": "c14", "name": "Hyderabad Reddy Sangh", "type": "Super", "parent_name": None, "state": "Telangana", "district": "Hyderabad", "taluka": "Hyderabad City", "village": "Banjara Hills", "plan": "Pro", "status": "Active", "logo_url": u("1438761681033-6461ffad8d80", 200, 200), "cover_url": u("1466442929976-97f336a657be", 800, 400), "gradient": "from-amber-600 to-orange-800", "desc": "Reddy community sangh of Hyderabad region." },
            { "id_str": "c15", "name": "Kolkata Bengali Parishad", "type": "Super", "parent_name": None, "state": "West Bengal", "district": "Kolkata", "taluka": "Kolkata City", "village": "Salt Lake", "plan": "Basic", "status": "Suspended", "logo_url": u("1494790108377-be9c29b29330", 200, 200), "cover_url": u("1558981852-426c6c22a060", 800, 400), "gradient": "from-rose-600 to-red-800", "desc": "Bengali cultural parishad serving Kolkata families." },
        ]

        communities_map = {}
        # First pass: create all communities without parents
        for item in communities_data:
            comm = Community.objects.create(
                name=item["name"],
                type=item["type"],
                state=item["state"],
                district=item["district"],
                taluka=item["taluka"],
                village=item["village"],
                plan=item["plan"],
                status=item["status"],
                logo_url=item["logo_url"],
                cover_url=item["cover_url"],
                gradient=item["gradient"],
                desc=item["desc"]
            )
            communities_map[item["name"]] = comm
            communities_map[item["id_str"]] = comm

        # Second pass: hook up parent relationships
        for item in communities_data:
            if item["parent_name"]:
                comm = communities_map[item["name"]]
                comm.parent = communities_map.get(item["parent_name"])
                comm.save()

        # 3. Create Core Demo Users
        # a) Member user
        rohit_user, _ = User.objects.get_or_create(username='rohit@example.com', email='rohit@example.com')
        rohit_user.set_password('admin123')
        rohit_user.first_name = "Rohit"
        rohit_user.last_name = "Patel"
        rohit_user.save()
        
        Member.objects.create(
            user=rohit_user,
            name="Rohit Patel",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            age=28,
            gender="Male",
            email="rohit@example.com",
            phone="+91 9800012345",
            village="Rampara",
            profession="Software Engineer",
            education="B.Tech",
            community=communities_map["Rampara Ahir Samaj"],
            status="Verified",
            aadhaar_status="Approved",
            role="member"
        )

        # b) Community Admin user
        mehul_user, _ = User.objects.get_or_create(username='mehul@samaj.org', email='mehul@samaj.org')
        mehul_user.set_password('admin123')
        mehul_user.first_name = "Mehul"
        mehul_user.last_name = "Solanki"
        mehul_user.save()

        Member.objects.create(
            user=mehul_user,
            name="Mehul Solanki",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
            age=34,
            gender="Male",
            email="mehul@samaj.org",
            phone="+91 9900012345",
            village="Rajula",
            profession="Business Owner",
            education="MBA",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="community_admin"
        )

        # c) Super Admin user
        admin_member_profile = Member.objects.create(
            user=admin_user,
            name="Admin Desai",
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
            age=40,
            gender="Male",
            email="admin@weareunited.in",
            phone="+91 9000012345",
            village="Rajula",
            profession="Chartered Accountant",
            education="CA",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="super_admin"
        )

        # d) Frontend Quick Demo Account: rutvika@gmail.com
        rutvika_user, _ = User.objects.get_or_create(username='rutvika@gmail.com', email='rutvika@gmail.com')
        rutvika_user.set_password('Admin@123')
        rutvika_user.first_name = "Rutvika"
        rutvika_user.last_name = "Jinjala"
        rutvika_user.save()
        Member.objects.create(
            user=rutvika_user,
            name="Rutvika Jinjala",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
            age=29,
            gender="Female",
            email="rutvika@gmail.com",
            phone="+91 9900012346",
            village="Rampara",
            profession="Architect",
            education="B.Arch",
            community=communities_map["Rampara Ahir Samaj"],
            status="Verified",
            aadhaar_status="Approved",
            role="community_admin"
        )

        # e) Frontend Quick Demo Account: ruta@gmail.com
        ruta_user, _ = User.objects.get_or_create(username='ruta@gmail.com', email='ruta@gmail.com')
        ruta_user.set_password('Admin@123')
        ruta_user.first_name = "Ruta"
        ruta_user.last_name = "Ahir"
        ruta_user.save()
        Member.objects.create(
            user=ruta_user,
            name="Ruta Ahir",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
            age=26,
            gender="Female",
            email="ruta@gmail.com",
            phone="+91 9900012347",
            village="Rajula",
            profession="Interior Designer",
            education="B.Des",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="community_admin"
        )

        # f) Frontend Quick Demo Account: harshilshah_496
        harshil_user, _ = User.objects.get_or_create(username='harshilshah_496', email='harshilshah_496@gmail.com')
        harshil_user.set_password('Admin@123')
        harshil_user.first_name = "Harshil"
        harshil_user.last_name = "Shah"
        harshil_user.save()
        Member.objects.create(
            user=harshil_user,
            name="Harshil Shah",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            age=27,
            gender="Male",
            email="harshilshah_496@gmail.com",
            phone="+91 9900012348",
            village="Rajula",
            profession="Data Analyst",
            education="B.Sc",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="member"
        )

        # g) Additional test user requested: member2@gmail.com
        member2_user, _ = User.objects.get_or_create(username='member2@gmail.com', email='member2@gmail.com')
        member2_user.set_password('Admin@123')
        member2_user.first_name = "Member"
        member2_user.last_name = "Two"
        member2_user.save()
        Member.objects.create(
            user=member2_user,
            name="Member Two",
            avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop",
            age=25,
            gender="Male",
            email="member2@gmail.com",
            phone="+91 9900012349",
            village="Rajula",
            profession="Project Manager",
            education="B.BA",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="member"
        )

        # h) Additional test user: member1@gmail.com
        member1_user, _ = User.objects.get_or_create(username='member1@gmail.com', email='member1@gmail.com')
        member1_user.set_password('Admin@123')
        member1_user.first_name = "Member"
        member1_user.last_name = "One"
        member1_user.save()
        Member.objects.create(
            user=member1_user,
            name="Member One",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            age=24,
            gender="Male",
            email="member1@gmail.com",
            phone="+91 9900012350",
            village="Rajula",
            profession="Analyst",
            education="B.Com",
            community=communities_map["Rajula Samaj Mandal"],
            status="Verified",
            aadhaar_status="Approved",
            role="member"
        )

        # 4. Generate all other 30 members programmatically to match frontend
        avatars = [
            "1500648767791-00dcc994a43e", "1494790108377-be9c29b29330", "1438761681033-6461ffad8d80",
            "1507003211169-0a1dd7228f2d", "1472099645785-5658abf4ff4e", "1544005313-94ddf0286df2",
            "1573496359142-b8d87734a5a2", "1580489944761-15a19d654956", "1531746020798-e6953c6e8e04",
            "1521119989659-a83eee488004", "1517841905240-472988babdf9", "1488161628813-04466f872be2",
            "1534528741775-53994a69daeb", "1546961342-c4cc3b9da17a", "1583195764036-6dc248ac07d9",
            "1492562080023-ab3db95bfbce", "1530268729831-4b0b9e170218", "1567532939604-b6b5b0db2604",
            "1564564321837-a57b7070ac4f", "1502685104226-ee32379fefbe", "1542909168-82c3e7fdca5c",
            "1559941707-c8bd1b9c3a6d", "1611432579699-484f7990b127", "1601412436009-d964bd02edbc",
            "1607746882042-944635dfe10e", "1503467913725-3e02a0f3bfaa", "1531123897727-8f129e1688ce",
            "1502823403499-6ccfcf4fb453", "1463453091185-61582044d556", "1499996860823-5214fcc65f8f",
        ]
        firstNames = ["Rohit", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Karan", "Riya", "Suresh", "Pooja", "Mehul", "Disha", "Hardik", "Kavya", "Nilesh", "Ishita", "Tejas", "Aditi", "Bhavesh", "Megha", "Chirag", "Sapna", "Dhruv", "Tanvi", "Eshan", "Urvi", "Falguni", "Vihaan", "Gauri", "Yash"]
        lastNames = ["Patel", "Solanki", "Mehta", "Shah", "Joshi", "Desai", "Trivedi", "Pandya", "Vyas", "Bhatt", "Modi", "Parekh", "Thakkar", "Gohil", "Vaghela"]
        villages = ["Rampara", "Rajula", "Khambha", "Una", "Jafrabad", "Liliya", "Babra", "Bagasara", "Dhari", "Savarkundla"]
        professions = ["Software Engineer", "Doctor", "Teacher", "Business Owner", "Chartered Accountant", "Civil Engineer", "Lawyer", "Designer", "Architect", "Pharmacist"]
        statuses = ["Verified", "Verified", "Verified", "Pending", "Pending", "Rejected", "Suspended"]
        educations = ["B.Tech", "MBBS", "B.Com", "MBA", "M.Sc"]
        
        community_keys = list(communities_map.keys())[0:15] # unique community objects
        unique_communities = [communities_map[k] for k in community_keys if len(k) == 2] # filters only c1-c15 keys
        
        for i in range(30):
            email = f"member{i + 1}@samaj.in"
            if User.objects.filter(username=email).exists() or Member.objects.filter(email=email).exists():
                continue
            
            # Create user for each member
            u_fname = firstNames[i % len(firstNames)]
            u_lname = lastNames[i % len(lastNames)]
            u_name = f"{u_fname} {u_lname}"
            
            new_u = User.objects.create(
                username=email,
                email=email,
                first_name=u_fname,
                last_name=u_lname
            )
            new_u.set_password('password123')
            new_u.save()
            
            target_community = unique_communities[i % len(unique_communities)]
            
            m_status = statuses[i % len(statuses)]
            Member.objects.create(
                user=new_u,
                name=u_name,
                avatar_url=u(avatars[i % len(avatars)], 200, 200),
                age=22 + (i % 35),
                gender="Female" if i % 3 == 0 else "Male",
                email=email,
                phone=f"+91 98000{10000 + i}",
                village=villages[i % len(villages)],
                profession=professions[i % len(professions)],
                education=educations[i % len(educations)],
                community=target_community,
                status=m_status,
                aadhaar=f"1234123410{10+i}",
                aadhaar_status='Approved' if m_status == 'Verified' else 'Pending',
                role="member"
            )

        # 5. Events
        events_data = [
            { "title": "Annual Samaj Sammelan 2026", "type": "Sammelan", "date": "2026-07-15", "time": "10:00 AM", "venue": "Rajula Community Hall", "attendees": 420, "max": 500, "status": "Upcoming", "color": "blue", "img_url": u("1530023367847-a683933f4172", 800, 500), "desc": "Annual gathering of all member families for cultural programs, awards, and networking." },
            { "title": "Blood Donation Camp", "type": "Blood Donation", "date": "2026-06-22", "time": "9:00 AM", "venue": "Govt Hospital Amreli", "attendees": 180, "max": 250, "status": "Upcoming", "color": "red", "img_url": u("1615461066841-6116e61058f4", 800, 500), "desc": "Voluntary blood donation camp in association with Red Cross." },
            { "title": "Cricket Tournament 2026", "type": "Sports", "date": "2026-08-05", "time": "8:00 AM", "venue": "Sports Ground Rampara", "attendees": 320, "max": 400, "status": "Upcoming", "color": "green", "img_url": u("1531415074968-036ba1b575da", 800, 500), "desc": "Inter-village cricket tournament with 16 participating teams." },
            { "title": "Mass Marriage Ceremony", "type": "Marriage", "date": "2026-09-10", "time": "6:00 PM", "venue": "Patel Vadi Rajula", "attendees": 850, "max": 1000, "status": "Upcoming", "color": "pink", "img_url": u("1519741497674-611481863552", 800, 500), "desc": "Collective wedding ceremony for 18 couples organised by samaj." },
            { "title": "Education Scholarship Awards", "type": "Meeting", "date": "2026-06-30", "time": "5:00 PM", "venue": "Samaj Bhavan", "attendees": 230, "max": 300, "status": "Upcoming", "color": "indigo", "img_url": u("1523050854058-8df90110c9f1", 800, 500), "desc": "Recognising academic achievers from the community." },
            { "title": "Diwali Snehmilan", "type": "Sammelan", "date": "2026-11-02", "time": "7:00 PM", "venue": "Community Garden", "attendees": 600, "max": 800, "status": "Upcoming", "color": "orange", "img_url": u("1572976108-7bcd0a5e9bcd", 800, 500), "desc": "Festive Diwali celebration with cultural performances and dinner." },
            { "title": "Health Check-up Camp", "type": "Meeting", "date": "2026-05-18", "time": "9:00 AM", "venue": "Samaj Bhavan", "attendees": 290, "max": 300, "status": "Completed", "color": "teal", "img_url": u("1576091160399-112ba8d25d1d", 800, 500), "desc": "Free health screening for senior members." },
            { "title": "Yoga Workshop", "type": "Meeting", "date": "2026-06-21", "time": "6:00 AM", "venue": "Community Park", "attendees": 120, "max": 150, "status": "Upcoming", "color": "emerald", "img_url": u("1545205597-3d9d02c29597", 800, 500), "desc": "International Yoga Day session for all ages." },
            { "title": "Women Empowerment Seminar", "type": "Meeting", "date": "2026-07-08", "time": "4:00 PM", "venue": "Auditorium", "attendees": 195, "max": 250, "status": "Upcoming", "color": "purple", "img_url": u("1573164574511-73c773193279", 800, 500), "desc": "Inspiring talks and skill-building for women members." },
            { "title": "Senior Citizen Honour", "type": "Meeting", "date": "2026-05-05", "time": "5:00 PM", "venue": "Samaj Bhavan", "attendees": 140, "max": 200, "status": "Completed", "color": "amber", "img_url": u("1559643014-aab6c39e2bb1", 800, 500), "desc": "Felicitation of elders aged 75+." }
        ]

        for i, ev in enumerate(events_data):
            # associate events with communities
            target_community = unique_communities[i % len(unique_communities)]
            Event.objects.create(
                title=ev["title"],
                type=ev["type"],
                date=datetime.datetime.strptime(ev["date"], "%Y-%m-%d").date(),
                time=ev["time"],
                venue=ev["venue"],
                attendees=ev["attendees"],
                max_attendees=ev["max"],
                status=ev["status"],
                color=ev["color"],
                img_url=ev["img_url"],
                desc=ev["desc"],
                community=target_community
            )

        # 6. Jobs
        jobs_data = [
            { "role": "Senior Software Engineer", "company": "TechMantra Pvt Ltd", "location": "Ahmedabad", "salary": "₹12-18 LPA", "type": "Full-time", "category": "Tech", "logo_letter": "T", "applicants": 45, "desc": "Build scalable backends in Node.js + Postgres for fintech client." },
            { "role": "Marketing Manager", "company": "Reliance Retail", "location": "Mumbai", "salary": "₹8-14 LPA", "type": "Full-time", "category": "Marketing", "logo_letter": "R", "applicants": 78, "desc": "Lead regional marketing campaigns across 200 stores." },
            { "role": "Chartered Accountant", "company": "Desai & Associates", "location": "Surat", "salary": "₹7-10 LPA", "type": "Full-time", "category": "Finance", "logo_letter": "D", "applicants": 32, "desc": "Tax filing, audit, and advisory for SME clients." },
            { "role": "Civil Engineer (Site)", "company": "Patel Constructions", "location": "Rajkot", "salary": "₹5-8 LPA", "type": "Full-time", "category": "Engineering", "logo_letter": "P", "applicants": 19, "desc": "Site supervision for residential township project." },
            { "role": "Doctor (MBBS)", "company": "Shree Krishna Hospital", "location": "Amreli", "salary": "₹10-15 LPA", "type": "Full-time", "category": "Healthcare", "logo_letter": "S", "applicants": 12, "desc": "General medicine consultant for community hospital." },
            { "role": "Graphic Designer", "company": "Pixel Forge Studio", "location": "Remote", "salary": "₹4-7 LPA", "type": "Remote", "category": "Design", "logo_letter": "P", "applicants": 56, "desc": "Brand design and digital assets for D2C startups." },
            { "role": "Sales Executive", "company": "Asian Paints", "location": "Vadodara", "salary": "₹3-5 LPA", "type": "Full-time", "category": "Sales", "logo_letter": "A", "applicants": 88, "desc": "B2B sales for paints and coatings vertical." },
            { "role": "Teacher (Mathematics)", "company": "DPS Bopal", "location": "Ahmedabad", "salary": "₹4-6 LPA", "type": "Full-time", "category": "Education", "logo_letter": "D", "applicants": 24, "desc": "Senior school maths faculty for grades 9-12." },
            { "role": "Operations Intern", "company": "Zomato", "location": "Bangalore", "salary": "₹25K/month", "type": "Internship", "category": "Operations", "logo_letter": "Z", "applicants": 134, "desc": "City operations support intern, 6 months." },
            { "role": "Pharmacist", "company": "Apollo Pharmacy", "location": "Rajula", "salary": "₹3-4 LPA", "type": "Full-time", "category": "Healthcare", "logo_letter": "A", "applicants": 11, "desc": "Retail pharmacy operations." },
            { "role": "Architect", "company": "Studio Lotus", "location": "Delhi", "salary": "₹9-14 LPA", "type": "Full-time", "category": "Design", "logo_letter": "S", "applicants": 27, "desc": "Mid-level architect for institutional projects." },
            { "role": "Data Analyst", "company": "PhonePe", "location": "Bengaluru", "salary": "₹10-16 LPA", "type": "Full-time", "category": "Tech", "logo_letter": "P", "applicants": 63, "desc": "SQL, Python, dashboarding for product analytics." }
        ]

        for i, jb in enumerate(jobs_data):
            target_community = unique_communities[i % len(unique_communities)]
            Job.objects.create(
                role=jb["role"],
                company=jb["company"],
                location=jb["location"],
                salary=jb["salary"],
                type=jb["type"],
                category=jb["category"],
                logo_letter=jb["logo_letter"],
                applicants=jb["applicants"],
                desc=jb["desc"],
                community=target_community
            )

        # 7. Businesses
        businesses_data = [
            { "name": "Shree Krishna Sweets", "category": "Food & Bakery", "owner": "Hardik Patel", "location": "Rajula", "phone": "+91 9824012345", "rating": 4.6, "img_url": u("1551024506-0bccd828d307", 600, 400), "verified": True, "desc": "Famous for traditional Gujarati sweets and farsan since 1985." },
            { "name": "Patel Steel Industries", "category": "Manufacturing", "owner": "Mehul Solanki", "location": "Ahmedabad", "phone": "+91 9898012345", "rating": 4.4, "img_url": u("1565008447742-97f6f38c985c", 600, 400), "verified": True, "desc": "Steel structures and fabrication for industrial clients." },
            { "name": "Desai Jewellers", "category": "Jewellery", "owner": "Suresh Desai", "location": "Surat", "phone": "+91 9924012345", "rating": 4.8, "img_url": u("1605100804763-247f67b3557e", 600, 400), "verified": True, "desc": "Three generations of trusted gold and diamond jewellery." },
            { "name": "Vyas Pharma", "category": "Healthcare", "owner": "Nilesh Vyas", "location": "Amreli", "phone": "+91 9913012345", "rating": 4.2, "img_url": u("1587854692152-cbe660dbde88", 600, 400), "verified": False, "desc": "Pharmacy and surgical supplies wholesale." },
            { "name": "Joshi Textiles", "category": "Textile", "owner": "Falguni Joshi", "location": "Surat", "phone": "+91 9825012345", "rating": 4.5, "img_url": u("1558769132-cb1aea458c5e", 600, 400), "verified": True, "desc": "Handloom and machine-woven fabrics manufacturer." },
            { "name": "Mehta Constructions", "category": "Construction", "owner": "Vikram Mehta", "location": "Rajkot", "phone": "+91 9879012345", "rating": 4.3, "img_url": u("1503387762-592deb58ef4e", 600, 400), "verified": True, "desc": "Residential and commercial real estate developer." },
            { "name": "Shah Auto Garage", "category": "Automobile", "owner": "Karan Shah", "location": "Bhavnagar", "phone": "+91 9558012345", "rating": 4.1, "img_url": u("1486006920555-c77dcf18193c", 600, 400), "verified": True, "desc": "Multi-brand car service and repair workshop." },
            { "name": "Gohil Restaurant", "category": "Food & Bakery", "owner": "Tejas Gohil", "location": "Rajula", "phone": "+91 9909012345", "rating": 4.7, "img_url": u("1517248135467-4c7edcad34c4", 600, 400), "verified": True, "desc": "Family restaurant serving Gujarati thali and chinese." },
            { "name": "Parekh CA Firm", "category": "Professional", "owner": "Disha Parekh", "location": "Ahmedabad", "phone": "+91 9924512345", "rating": 4.6, "img_url": u("1454165804606-c3d57bc86b40", 600, 400), "verified": True, "desc": "Tax, audit and advisory services for SMEs." },
            { "name": "Trivedi Coaching", "category": "Education", "owner": "Bhavesh Trivedi", "location": "Rajkot", "phone": "+91 9824512345", "rating": 4.5, "img_url": u("1503676260728-1c00da094a0b", 600, 400), "verified": True, "desc": "Engineering and medical entrance coaching institute." }
        ]

        for i, bus in enumerate(businesses_data):
            target_community = unique_communities[i % len(unique_communities)]
            Business.objects.create(
                name=bus["name"],
                category=bus["category"],
                owner=bus["owner"],
                location=bus["location"],
                phone=bus["phone"],
                rating=bus["rating"],
                img_url=bus["img_url"],
                verified=bus["verified"],
                desc=bus["desc"],
                community=target_community
            )

        # 8. Matrimony Profiles
        matriPhotos = ["1494790108377-be9c29b29330", "1438761681033-6461ffad8d80", "1544005313-94ddf0286df2", "1573496359142-b8d87734a5a2", "1580489944761-15a19d654956", "1500648767791-00dcc994a43e", "1507003211169-0a1dd7228f2d", "1472099645785-5658abf4ff4e", "1531746020798-e6953c6e8e04", "1517841905240-472988babdf9", "1488161628813-04466f872be2", "1534528741775-53994a69daeb", "1546961342-c4cc3b9da17a", "1583195764036-6dc248ac07d9", "1492562080023-ab3db95bfbce", "1530268729831-4b0b9e170218", "1567532939604-b6b5b0db2604", "1564564321837-a57b7070ac4f", "1502685104226-ee32379fefbe", "1542909168-82c3e7fdca5c"]
        educations_mat = ["B.Tech", "MBBS", "MBA", "M.Com", "CA", "B.Arch"]
        locations_mat = ["Rajula", "Surat", "Ahmedabad", "Mumbai", "Pune"]
        statuses_mat = ["Approved", "Approved", "Pending", "Featured"]

        for i in range(20):
            target_community = unique_communities[i % len(unique_communities)]
            f_idx = (i * 3) % len(firstNames)
            l_idx = i % len(lastNames)
            name = f"{firstNames[f_idx]} {lastNames[l_idx]}"
            
            MatrimonyProfile.objects.create(
                name=name,
                gender="Bride" if i < 10 else "Groom",
                age=22 + (i % 12),
                education=educations_mat[i % len(educations_mat)],
                profession=professions[i % len(professions)],
                city=locations_mat[i % len(locations_mat)],
                photo_url=u(matriPhotos[i % len(matriPhotos)], 400, 500),
                match=60 + ((i * 7) % 40),
                status=statuses_mat[i % len(statuses_mat)],
                height=f"5'{4 + (i % 6)}\"",
                income=f"₹{5 + (i % 15)}-{10 + (i % 20)} LPA",
                about="Looking for a like-minded partner from same community values.",
                community=target_community
            )

        # 9. Campaigns and Donations
        campaigns_data = [
            { "title": "Samaj Bhavan Renovation", "goal": 2500000, "raised": 1840000, "img_url": u("1448630360428-65456885c650", 800, 400), "desc": "Help us renovate the 50-year-old community hall." },
            { "title": "Education Scholarship Fund", "goal": 1000000, "raised": 720000, "img_url": u("1523050854058-8df90110c9f1", 800, 400), "desc": "Scholarships for 200 deserving students from our community." },
            { "title": "Medical Emergency Aid", "goal": 500000, "raised": 285000, "img_url": u("1576091160399-112ba8d25d1d", 800, 400), "desc": "Financial aid for members facing critical illnesses." },
            { "title": "Senior Citizen Care", "goal": 800000, "raised": 410000, "img_url": u("1559643014-aab6c39e2bb1", 800, 400), "desc": "Monthly support and healthcare for 80+ elders." }
        ]

        campaigns_list = []
        for i, camp in enumerate(campaigns_data):
            target_community = unique_communities[i % len(unique_communities)]
            c = Campaign.objects.create(
                title=camp["title"],
                goal=camp["goal"],
                raised=camp["raised"],
                img_url=camp["img_url"],
                desc=camp["desc"],
                community=target_community
            )
            campaigns_list.append(c)

        # Donations (20 entries)
        donation_methods = ["UPI", "Bank Transfer", "Cash"]
        for i in range(20):
            donor_fname = firstNames[i % len(firstNames)]
            donor_lname = lastNames[i % len(lastNames)]
            camp = campaigns_list[i % len(campaigns_list)]
            
            Donation.objects.create(
                donor=f"{donor_fname} {donor_lname}",
                amount=[501, 1100, 2100, 5100, 11000, 21000, 51000][i % 7],
                campaign=camp,
                note="In memory of beloved family member" if i % 3 == 0 else "",
                method=donation_methods[i % len(donation_methods)],
                status="Success"
            )

        # 10. News & Announcements
        news_data = [
            { "title": "Annual Sammelan dates announced", "category": "Meeting Notice", "img_url": u("1530023367847-a683933f4172", 600, 400), "excerpt": "The 42nd Annual Samaj Sammelan is scheduled for July 15, 2026 at Rajula Community Hall." },
            { "title": "Riya Patel tops UPSC 2026 — 18th rank", "category": "Achievement", "img_url": u("1573164574511-73c773193279", 600, 400), "excerpt": "Pride of our community, Riya Patel from Rampara has secured AIR 18 in UPSC CSE 2026." },
            { "title": "Heavy rainfall alert in Amreli district", "category": "Alert", "img_url": u("1561553873-e8491a564fd0", 600, 400), "excerpt": "IMD has issued an orange alert. Members are requested to stay safe." },
            { "title": "New scholarship scheme launched", "category": "General", "img_url": u("1523580494863-6f3031224c94", 600, 400), "excerpt": "₹50,000 scholarship for engineering and medical aspirants from EWS families." },
            { "title": "Blood donation camp success", "category": "General", "img_url": u("1615461066841-6116e61058f4", 600, 400), "excerpt": "Last week's camp collected 280 units of blood, our highest ever." }
        ]

        for i, news_item in enumerate(news_data):
            target_community = unique_communities[i % len(unique_communities)]
            News.objects.create(
                title=news_item["title"],
                category=news_item["category"],
                img_url=news_item["img_url"],
                excerpt=news_item["excerpt"],
                community=target_community
            )

        # 11. Committee members
        committee_data = [
            { "name": "Bhavesh Trivedi", "designation": "President", "since": "2024-01-15", "phone": "+91 9824000001", "email": "president@samaj.org", "photo_url": u(avatars[4], 200, 200) },
            { "name": "Disha Parekh", "designation": "Vice President", "since": "2024-01-15", "phone": "+91 9824000002", "email": "vp@samaj.org", "photo_url": u(avatars[1], 200, 200) },
            { "name": "Hardik Patel", "designation": "Secretary", "since": "2024-01-15", "phone": "+91 9824000003", "email": "secretary@samaj.org", "photo_url": u(avatars[0], 200, 200) },
            { "name": "Sapna Modi", "designation": "Treasurer", "since": "2024-01-15", "phone": "+91 9824000004", "email": "treasurer@samaj.org", "photo_url": u(avatars[5], 200, 200) },
            { "name": "Tejas Gohil", "designation": "Member", "since": "2024-01-15", "phone": "+91 9824000005", "email": "m1@samaj.org", "photo_url": u(avatars[7], 200, 200) }
        ]

        for i, comm in enumerate(committee_data):
            target_community = unique_communities[i % len(unique_communities)]
            Committee.objects.create(
                name=comm["name"],
                designation=comm["designation"],
                since=datetime.datetime.strptime(comm["since"], "%Y-%m-%d").date(),
                phone=comm["phone"],
                email=comm["email"],
                photo_url=comm["photo_url"],
                community=target_community
            )

        # 12. Families & Family Members
        for i in range(8):
            target_community = unique_communities[i % len(unique_communities)]
            head_name = f"{firstNames[i]} {lastNames[i % len(lastNames)]}"
            fam = Family.objects.create(
                head=head_name,
                village=villages[i % len(villages)],
                community=target_community
            )
            
            # create family members
            FamilyMember.objects.create(family=fam, name=head_name, relation="Self", age=45 + i, occupation=professions[i % len(professions)])
            FamilyMember.objects.create(family=fam, name=f"{firstNames[(i + 1) % len(firstNames)]} {lastNames[i % len(lastNames)]}", relation="Spouse", age=42 + i, occupation="Homemaker")
            FamilyMember.objects.create(family=fam, name=f"{firstNames[(i + 5) % len(firstNames)]} {lastNames[i % len(lastNames)]}", relation="Son", age=18 + i, occupation="Student")
            FamilyMember.objects.create(family=fam, name=f"{firstNames[(i + 8) % len(firstNames)]} {lastNames[i % len(lastNames)]}", relation="Daughter", age=16 + i, occupation="Student")

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with all mock datasets!'))
