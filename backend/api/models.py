from django.db import models
from django.contrib.auth.models import User

class CommunityManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class Community(models.Model):
    PLANS = (
        ('Free', 'Free'),
        ('Basic', 'Basic'),
        ('Pro', 'Pro'),
        ('Enterprise', 'Enterprise'),
    )
    STATUSES = (
        ('Pending Super Admin Approval', 'Pending Super Admin Approval'),
        ('Pending Parent Community Approval', 'Pending Parent Community Approval'),
        ('Approved', 'Approved'),
        ('Rejected By Super Admin', 'Rejected By Super Admin'),
        ('Rejected By Parent Community Admin', 'Rejected By Parent Community Admin'),
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
        ('Pending', 'Pending'),
    )
    
    name = models.CharField(max_length=255)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    objects = CommunityManager()
    all_objects = models.Manager()
    # type is now computed dynamically: 'Root' if no parent, else 'Branch'
    # Kept for backward compatibility - will be auto-set on save
    type = models.CharField(max_length=50, default='Root', blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subsidiaries')
    state = models.CharField(max_length=100, blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    taluka = models.CharField(max_length=100, blank=True, default='')
    village = models.CharField(max_length=100, blank=True, default='')
    plan = models.CharField(max_length=50, choices=PLANS, default='Free')
    status = models.CharField(max_length=100, choices=STATUSES, default='Pending Super Admin Approval')
    logo = models.ImageField(upload_to='community_logos/', null=True, blank=True)
    logo_url = models.URLField(max_length=500, null=True, blank=True)
    cover = models.ImageField(upload_to='community_covers/', null=True, blank=True)
    cover_url = models.URLField(max_length=500, null=True, blank=True)
    gradient = models.CharField(max_length=100, default='from-blue-600 to-indigo-700')
    desc = models.TextField(blank=True)
    
    # Registration fields
    caste = models.CharField(max_length=100, null=True, blank=True)
    sub_caste = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    est_year = models.IntegerField(null=True, blank=True)
    registration_no = models.CharField(max_length=100, null=True, blank=True)
    office_address = models.TextField(null=True, blank=True)
    website = models.URLField(max_length=500, null=True, blank=True)
    vision_mission = models.TextField(null=True, blank=True)
    social_fb = models.CharField(max_length=255, null=True, blank=True)
    social_tw = models.CharField(max_length=255, null=True, blank=True)
    social_yt = models.CharField(max_length=255, null=True, blank=True)
    doc_name = models.CharField(max_length=255, null=True, blank=True)

    @property
    def level(self):
        """Recursively compute depth level (root = 1)."""
        depth = 1
        node = self
        while node.parent_id:
            depth += 1
            node = node.parent
        return depth

    @property
    def path(self):
        """Return ancestor names from root to self as a list."""
        ancestors = []
        node = self
        while node:
            ancestors.append(node.name)
            node = node.parent
        return list(reversed(ancestors))

    @property
    def ancestors_list(self):
        """Return list of ancestor community dicts (id, name) from root to immediate parent."""
        result = []
        node = self.parent
        while node:
            result.append({'id': node.id, 'name': node.name, 'type': node.type})
            node = node.parent
        return list(reversed(result))

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk and self.parent:
            from api.quota_engine import check_quota_limit
            check_quota_limit(self.parent, 'max_communities')
        if self.parent:
            self.type = 'Subsidiary'
        else:
            self.type = 'Super'
        super().save(*args, **kwargs)

class Member(models.Model):
    GENDERS = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )
    STATUSES = (
        ('Verified', 'Verified'),
        ('Pending', 'Pending'),
        ('Rejected', 'Rejected'),
        ('Suspended', 'Suspended'),
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )
    ROLES = (
        ('member', 'Member'),
        ('community_admin', 'Community Admin'),
        ('super_admin', 'Super Admin'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='member_profile')
    name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDERS)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    village = models.CharField(max_length=100)
    taluka = models.CharField(max_length=100, default='Rajula')
    district = models.CharField(max_length=100, default='Amreli')
    state = models.CharField(max_length=100, default='Gujarat')
    profession = models.CharField(max_length=100)
    education = models.CharField(max_length=100)
    school = models.CharField(max_length=255, blank=True, null=True)
    college = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    field_of_study = models.CharField(max_length=255, blank=True, null=True)
    passing_year = models.CharField(max_length=50, blank=True, null=True)
    profession_type = models.CharField(max_length=100, blank=True, null=True)
    job_title = models.CharField(max_length=255, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    industry = models.CharField(max_length=255, blank=True, null=True)
    salary = models.CharField(max_length=100, blank=True, null=True)
    job_work_mode = models.CharField(max_length=100, blank=True, null=True)
    job_type = models.CharField(max_length=100, blank=True, null=True)
    job_city = models.CharField(max_length=100, blank=True, null=True)
    job_state = models.CharField(max_length=100, blank=True, null=True)
    job_country = models.CharField(max_length=100, blank=True, null=True)
    job_address = models.TextField(blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_category = models.CharField(max_length=255, blank=True, null=True)
    gst_no = models.CharField(max_length=100, blank=True, null=True)
    business_years = models.CharField(max_length=50, blank=True, null=True)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='members')
    status = models.CharField(max_length=50, choices=STATUSES, default='Pending')
    email_verified = models.BooleanField(default=True)
    joined_date = models.DateField(auto_now_add=True)
    aadhaar = models.CharField(max_length=12, blank=True)
    aadhaar_photo = models.ImageField(upload_to='aadhaar_photos/', null=True, blank=True)
    aadhaar_status = models.CharField(max_length=50, default='Pending')
    role = models.CharField(max_length=50, choices=ROLES, default='member')
    custom_role = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    permissions = models.JSONField(default=list, blank=True, null=True)
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk:
            from api.quota_engine import check_quota_limit
            check_quota_limit(self.community, 'max_members')
        if self.avatar and hasattr(self.avatar, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_avatar = False
            if not self.pk:
                is_new_avatar = True
            else:
                try:
                    orig = Member.objects.get(pk=self.pk)
                    if orig.avatar != self.avatar:
                        is_new_avatar = True
                except Member.DoesNotExist:
                    is_new_avatar = True
            if is_new_avatar:
                check_storage_quota(self.community, self.avatar.size)
        super().save(*args, **kwargs)

class Committee(models.Model):
    name = models.CharField(max_length=255)
    designation = models.CharField(max_length=100)
    since = models.DateField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    photo = models.ImageField(upload_to='committee_photos/', null=True, blank=True)
    photo_url = models.URLField(max_length=500, null=True, blank=True)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='committee_members')
    role = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True, blank=True, related_name='committee_members')
    
    def __str__(self):
        return f"{self.name} - {self.designation} ({self.community.name})"

    def save(self, *args, **kwargs):
        if not self.pk:
            from api.quota_engine import check_quota_limit
            check_quota_limit(self.community, 'max_committee_members')
        if self.photo and hasattr(self.photo, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_photo = False
            if not self.pk:
                is_new_photo = True
            else:
                try:
                    orig = Committee.objects.get(pk=self.pk)
                    if orig.photo != self.photo:
                        is_new_photo = True
                except Committee.DoesNotExist:
                    is_new_photo = True
            if is_new_photo:
                check_storage_quota(self.community, self.photo.size)
        super().save(*args, **kwargs)

class Event(models.Model):
    STATUSES = (
        ('Draft', 'Draft'),
        ('Pending Approval', 'Pending Approval'),
        ('Published', 'Published'),
        ('Registration Open', 'Registration Open'),
        ('Ongoing', 'Ongoing'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    category = models.CharField(max_length=100, default='Cultural')
    date = models.DateField()
    time = models.CharField(max_length=50)
    start_time = models.CharField(max_length=50, blank=True, default='')
    end_time = models.CharField(max_length=50, blank=True, default='')
    venue = models.CharField(max_length=255)
    venue_details = models.TextField(blank=True, default='')
    attendees = models.IntegerField(default=0)
    max_attendees = models.IntegerField(default=500)
    status = models.CharField(max_length=50, choices=STATUSES, default='Published')
    color = models.CharField(max_length=50, default='blue')
    img = models.ImageField(upload_to='events/', null=True, blank=True)
    img_url = models.URLField(max_length=500, null=True, blank=True)
    desc = models.TextField()
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='events')
    visibility_scope = models.CharField(max_length=50, default='COMMUNITY_ONLY')
    
    organizer = models.CharField(max_length=255, blank=True, default='')
    speakers = models.JSONField(default=list, blank=True)
    schedule = models.JSONField(default=list, blank=True)
    gallery = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.img and hasattr(self.img, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_img = False
            if not self.pk:
                is_new_img = True
            else:
                try:
                    orig = Event.objects.get(pk=self.pk)
                    if orig.img != self.img:
                        is_new_img = True
                except Event.DoesNotExist:
                    is_new_img = True
            if is_new_img:
                check_storage_quota(self.community, self.img.size)
        super().save(*args, **kwargs)

class Job(models.Model):
    TYPES = (
        ('Full-time', 'Full-time'),
        ('Part-time', 'Part-time'),
        ('Remote', 'Remote'),
        ('Contract', 'Contract'),
        ('Internship', 'Internship'),
    )
    role = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=100)
    salary = models.CharField(max_length=100)
    type = models.CharField(max_length=50, choices=TYPES, default='Full-time')
    category = models.CharField(max_length=100)
    posted_date = models.DateField(auto_now_add=True)
    logo_letter = models.CharField(max_length=2, default='J')
    applicants = models.IntegerField(default=0)
    desc = models.TextField()
    community = models.ForeignKey(Community, on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs')
    visibility_scope = models.CharField(max_length=50, default='COMMUNITY_ONLY')
    
    def __str__(self):
        return f"{self.role} at {self.company}"

class JobApplication(models.Model):
    STATUS_CHOICES = (
        ('Applied', 'Applied'),
        ('Under Review', 'Under Review'),
        ('Shortlisted', 'Shortlisted'),
        ('Interview Scheduled', 'Interview Scheduled'),
        ('Selected', 'Selected'),
        ('Rejected', 'Rejected'),
    )

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='job_applications')
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='job_applications')
    
    # Personal Details
    full_name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    mobile = models.CharField(max_length=20)
    alt_mobile = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='India')

    # Professional Details
    occupation = models.CharField(max_length=255)
    company = models.CharField(max_length=255, null=True, blank=True)
    experience = models.CharField(max_length=100) # Total Experience
    relevant_experience = models.CharField(max_length=100, null=True, blank=True)
    current_salary = models.CharField(max_length=100, null=True, blank=True)
    expected_salary = models.CharField(max_length=100, null=True, blank=True)
    notice_period = models.CharField(max_length=100, null=True, blank=True)
    qualification = models.CharField(max_length=255)
    skills = models.TextField()

    # Documents & Links
    resume = models.FileField(upload_to='resumes/')
    cover_letter = models.TextField(null=True, blank=True)
    portfolio = models.URLField(max_length=500, null=True, blank=True)
    linkedin = models.URLField(max_length=500, null=True, blank=True)
    github = models.URLField(max_length=500, null=True, blank=True)

    # Additional Questions
    why_interested = models.TextField(null=True, blank=True)
    willing_to_relocate = models.BooleanField(default=False)
    available_joining_date = models.CharField(max_length=100, null=True, blank=True)

    # Workflow & Meta
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Applied')
    applied_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.job.role}"

class Business(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    owner = models.CharField(max_length=255)
    location = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    rating = models.FloatField(default=0.0)
    img = models.ImageField(upload_to='businesses/', null=True, blank=True)
    img_url = models.URLField(max_length=500, null=True, blank=True)
    verified = models.BooleanField(default=False)
    desc = models.TextField()
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='businesses')
    visibility_scope = models.CharField(max_length=50, default='COMMUNITY_ONLY')
    
    # Redesigned directory fields
    cover = models.ImageField(upload_to='businesses/covers/', null=True, blank=True)
    cover_url = models.URLField(max_length=500, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    whatsapp = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    website = models.URLField(max_length=500, null=True, blank=True)
    hours = models.JSONField(default=dict, null=True, blank=True)
    socials = models.JSONField(default=dict, null=True, blank=True)
    gallery = models.JSONField(default=list, null=True, blank=True)
    status = models.CharField(max_length=20, default='PENDING') # PENDING, VERIFIED, REJECTED, SUSPENDED
    featured = models.BooleanField(default=False)
    
    # Analytics
    views = models.IntegerField(default=0)
    opens = models.IntegerField(default=0)
    whatsapp_clicks = models.IntegerField(default=0)
    call_clicks = models.IntegerField(default=0)
    website_visits = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        # Sync status and verified
        if self.verified and self.status == 'PENDING':
            self.status = 'VERIFIED'
        elif not self.verified and self.status == 'VERIFIED':
            self.verified = True
        elif self.status == 'VERIFIED':
            self.verified = True
        else:
            self.verified = False
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class MatrimonyProfile(models.Model):
    GENDERS = (
        ('Bride', 'Bride'),
        ('Groom', 'Groom'),
    )
    STATUSES = (
        ('Draft', 'Draft'),
        ('Ready For Review', 'Ready For Review'),
        ('Pending Approval', 'Pending Approval'),
        ('Active', 'Active'),
        ('Approved', 'Approved'),
        ('Featured', 'Featured'),
        ('Rejected', 'Rejected'),
        ('Hidden', 'Hidden'),
        ('Suspended', 'Suspended'),
        ('Deleted', 'Deleted'),
    )
    
    # Core linkage
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_matrimony_profiles', null=True, blank=True)
    family_member = models.OneToOneField('FamilyMember', on_delete=models.CASCADE, related_name='matrimony_profile', null=True, blank=True)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='matrimony_profiles')
    
    # Basic Info
    name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=GENDERS)
    dob = models.DateField(null=True, blank=True)
    age = models.IntegerField(default=25)
    marital_status = models.CharField(max_length=50, default='Never Married') # Never Married, Divorced, Widowed
    
    # Divorced Info
    divorce_year = models.IntegerField(null=True, blank=True)
    has_children = models.BooleanField(default=False)
    children_count = models.IntegerField(null=True, blank=True)
    children_living_with = models.CharField(max_length=100, blank=True, default='')
    
    # Widowed Info
    year_of_loss = models.IntegerField(null=True, blank=True)
    widowed_children_info = models.TextField(blank=True, default='')
    
    # Personal Info
    height = models.CharField(max_length=20, blank=True, default='')
    weight = models.CharField(max_length=20, blank=True, default='')
    complexion = models.CharField(max_length=100, blank=True, default='')
    education = models.CharField(max_length=255, blank=True, default='')
    profession = models.CharField(max_length=255, blank=True, default='') # occupation
    income = models.CharField(max_length=100, blank=True, default='')
    religion = models.CharField(max_length=100, default='Hindu')
    caste = models.CharField(max_length=100, blank=True, default='')
    sub_caste = models.CharField(max_length=100, blank=True, default='')
    mother_tongue = models.CharField(max_length=100, blank=True, default='')
    languages_known = models.CharField(max_length=255, blank=True, default='')
    
    # Location
    country = models.CharField(max_length=100, default='India')
    state = models.CharField(max_length=100, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    current_address = models.TextField(blank=True, default='')
    native_place = models.CharField(max_length=255, blank=True, default='')
    
    # Lifestyle
    diet = models.CharField(max_length=50, default='Vegetarian') # Vegetarian, Jain, Vegan, Non-Veg
    smoking = models.CharField(max_length=50, default='No') # Yes, No, Occasionally
    drinking = models.CharField(max_length=50, default='No') # Yes, No, Occasionally
    
    # About
    about = models.TextField(blank=True, default='')
    
    # Verification Details
    aadhaar = models.CharField(max_length=50, blank=True, default='')
    pan = models.CharField(max_length=50, blank=True, default='')
    passport = models.CharField(max_length=50, blank=True, default='')
    driving_license = models.CharField(max_length=50, blank=True, default='')
    is_verified = models.BooleanField(default=False)
    review_notes = models.TextField(blank=True, default='')

    
    # Visibility Settings
    # My Community Only, Parent Community, Child Communities, Entire Hierarchy, Selected Communities, Public
    VISIBILITY_TYPES = (
        ('PRIVATE', 'Private'),
        ('COMMUNITY_NETWORK', 'Community Network'),
        ('CUSTOM_AUDIENCE', 'Custom Audience'),
        ('PLATFORM_WIDE', 'Platform Wide'),
    )

    visibility_type = models.CharField(max_length=50, choices=VISIBILITY_TYPES, default='COMMUNITY_NETWORK', db_index=True)
    # hierarchy_scope: My Community, Parent Community, Child Communities, Entire Network, Selected Communities
    hierarchy_scope = models.CharField(max_length=100, default='My Community', db_index=True)
    selected_communities = models.ManyToManyField(Community, related_name='visible_matrimony_profiles', blank=True)
    
    # Audience Filters (Custom Audience / targeting)
    target_communities = models.ManyToManyField(Community, related_name='targeted_matrimony_profiles', blank=True)
    target_castes = models.TextField(blank=True, default='') # comma-separated list
    target_subcastes = models.TextField(blank=True, default='')
    target_states = models.TextField(blank=True, default='')
    target_cities = models.TextField(blank=True, default='')
    target_gender = models.CharField(max_length=50, default='Everyone', db_index=True)
    target_age_min = models.IntegerField(default=18, db_index=True)
    target_age_max = models.IntegerField(default=60, db_index=True)
    target_marital_statuses = models.TextField(blank=True, default='') # comma-separated list
    target_educations = models.TextField(blank=True, default='') # comma-separated list
    target_occupations = models.TextField(blank=True, default='') # comma-separated list

    # Cached audience counts to speed up previews
    audience_count_cache = models.IntegerField(default=0)
    
    # Who Can Contact Me
    # Everyone Who Can View, Verified Members Only, Premium Members Only, Same Community Only, Selected Communities Only, Selected Castes Only, Nobody
    contact_permission = models.CharField(max_length=100, default='Everyone Who Can View')
    photo_permission = models.CharField(max_length=100, default='Everyone')
    allow_interests = models.BooleanField(default=True)
    allow_direct_chat = models.BooleanField(default=True)
    allow_phone = models.BooleanField(default=True)
    allow_whatsapp = models.BooleanField(default=True)
    allow_email = models.BooleanField(default=True)
    
    # Legacy fields compat
    photo = models.ImageField(upload_to='matrimony/', null=True, blank=True)
    photo_url = models.URLField(max_length=500, null=True, blank=True)
    match = models.IntegerField(default=0)
    family_details = models.TextField(blank=True, default='')
    contact_preferences = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, choices=STATUSES, default='Draft')

    # Contact person details (collected during profile creation wizard)
    contact_name = models.CharField(max_length=255, blank=True, default='')
    contact_relation = models.CharField(max_length=100, blank=True, default='')
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    contact_whatsapp = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    
    # Soft delete / Audit
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['visibility_type']),
            models.Index(fields=['gender']),
            models.Index(fields=['age']),
            models.Index(fields=['state']),
        ]

    @property
    def completion_percentage(self):
        return self.calculate_completion_percentage()

    def calculate_completion_percentage(self):
        """Calculate how complete this matrimony profile is (0-100%).
        
        Scoring weights (each True = 1 point, total = 20 points max):
        - Core identity: name, gender, dob                   (3 pts)
        - Education & career: education, profession, income   (3 pts)
        - Physical: height, weight, complexion                (3 pts)
        - Lifestyle: diet, marital_status                     (2 pts)
        - Mother tongue / religion                            (2 pts)
        - Location: city, state, native_place                 (3 pts)
        - About (min 50 chars)                                (1 pt)
        - Profile photo                                       (1 pt)
        - Partner preferences                                 (1 pt)
        - Contact info                                        (1 pt)
        """
        scored = [
            # Core identity
            ('name',            bool(self.name and self.name.strip())),
            ('gender',          bool(self.gender)),
            ('dob',             bool(self.dob)),
            # Education & career
            ('education',       bool(self.education and self.education.strip())),
            ('profession',      bool(self.profession and self.profession.strip())),
            ('income',          bool(self.income and self.income.strip())),
            # Physical
            ('height',          bool(self.height and self.height.strip())),
            ('weight',          bool(self.weight and self.weight.strip())),
            ('complexion',      bool(self.complexion and self.complexion.strip())),
            # Lifestyle (these have defaults so they are always non-empty; check for non-default or any value)
            ('diet',            bool(self.diet and self.diet.strip())),
            ('marital_status',  bool(self.marital_status and self.marital_status.strip())),
            # Heritage / language
            ('mother_tongue',   bool(self.mother_tongue and self.mother_tongue.strip())),
            ('religion',        bool(self.religion and self.religion.strip())),
            # Location
            ('city',            bool(self.city and self.city.strip())),
            ('state',           bool(self.state and self.state.strip())),
            ('native_place',    bool(self.native_place and self.native_place.strip())),
            # About (at least 50 chars)
            ('about',           bool(self.about and len(self.about.strip()) >= 50)),
            # Photos
            ('photo',           bool(self.photos.exists() or self.photo)),
            # Partner preferences
            ('preferences',     self._has_preferences()),
            # Contact info (name OR phone is enough)
            ('contact_info',    bool(
                (self.contact_name and self.contact_name.strip()) or
                (self.contact_phone and self.contact_phone.strip()) or
                self.name  # fallback: profile name counts as contact
            )),
        ]
        filled = sum(1 for _, v in scored if v)
        pct = int((filled / len(scored)) * 100)
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        incomplete = [k for k, v in scored if not v]
        logger.info(
            f"[MatrimonyProfile #{self.pk}] Completion: {filled}/{len(scored)} = {pct}%"
            + (f" | Incomplete: {incomplete}" if incomplete else " | All complete!")
        )
        return pct

    def calculate_match_score(self, other):
        """Calculate dynamic match score between this profile and another profile (0-100%)."""
        from api.rule_engine import MatrimonyRuleEngine
        return MatrimonyRuleEngine.calculateMatchScore(self, other)["score"]


    def _has_preferences(self):
        try:
            pref = self.partner_preference
            if pref and any([
                pref.gender, pref.caste, pref.sub_caste,
                pref.education, pref.occupation, pref.city, pref.state,
                pref.min_age != 18 or pref.max_age != 60,  # non-default age range
            ]):
                return True
        except Exception:
            pass
        return False

    def recalculate_status(self, save=True):
        """Auto-calculate status based on current profile completeness.
        Transitions:
          Draft            → requires: core fields + primary photo + completion >= 50%
          Ready For Review → completion >= 50%, core fields + photo present, not verified
          Active           → same as Ready For Review but is_verified=True
          Suspended/Hidden → admin-set; never auto-changed
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Never override admin-set statuses (except Rejected — allow re-submission after member edits)
        if self.status in ('Suspended', 'Hidden', 'Deleted', 'Featured', 'Approved', 'Active'):
            return self.status


        completion = self.calculate_completion_percentage()
        has_primary_photo = self.photos.filter(category='Profile Photo').exists() or bool(self.photo)

        # Minimum mandatory fields required to leave Draft
        has_core = all([
            self.name and self.name.strip(),
            self.gender,
            self.dob,
            self.education and self.education.strip(),
            self.profession and self.profession.strip(),
            self.city and self.city.strip(),
            self.state and self.state.strip(),
        ])

        # Threshold: 50% completion + core fields + primary photo to leave Draft
        if not has_core or not has_primary_photo or completion < 50:
            new_status = 'Draft'
        elif self.is_verified:
            new_status = 'Approved'
        else:
            new_status = 'Pending Approval'

        logger.info(
            f"[MatrimonyProfile #{self.pk}] recalculate_status: "
            f"completion={completion}%, has_core={has_core}, has_photo={has_primary_photo}, "
            f"is_verified={self.is_verified} → {self.status} → {new_status}"
        )

        if self.status != new_status:
            self.status = new_status
            if save:
                MatrimonyProfile.objects.filter(pk=self.pk).update(status=new_status)
                self.status = new_status  # update in-memory state
        return new_status

    def save(self, *args, **kwargs):
        update_fields = kwargs.get('update_fields')
        super().save(*args, **kwargs)
        # Invalidate Preference cache
        try:
            from api.preference_engine import PreferenceEngine
            PreferenceEngine.invalidate_cache_for_profile(self.id)
        except Exception:
            pass
        # Recalculate status after every save EXCEPT when we're only updating the status field itself
        # (to avoid infinite recursion)
        if not update_fields or 'status' not in update_fields:
            try:
                self.recalculate_status(save=True)
            except Exception:
                pass

    def is_visible_to_user(self, viewer_user):
        from api.rule_engine import MatrimonyRuleEngine
        return MatrimonyRuleEngine.canViewProfile(self, viewer_user)

    def __str__(self):
        return f"{self.name} ({self.gender})"

class MatrimonyPhoto(models.Model):
    CATEGORIES = (
        ('Profile Photo', 'Profile Photo'),
        ('Family Photo', 'Family Photo'),
        ('Lifestyle Photo', 'Lifestyle Photo'),
    )
    profile = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='matrimony_photos/', null=True, blank=True)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORIES, default='Profile Photo')
    is_private = models.BooleanField(default=False) # Visible Only After Interest Accepted
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"Photo for {self.profile.name} ({self.category})"

class PartnerPreference(models.Model):
    profile = models.OneToOneField(MatrimonyProfile, on_delete=models.CASCADE, related_name='partner_preference', null=True, blank=True)
    # Legacy compat
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='partner_preferences', null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True, default='')
    min_age = models.IntegerField(default=18)
    max_age = models.IntegerField(default=60)
    caste = models.CharField(max_length=100, blank=True, default='')
    sub_caste = models.CharField(max_length=100, blank=True, default='')
    education = models.CharField(max_length=100, blank=True, default='')
    occupation = models.CharField(max_length=100, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    min_height = models.CharField(max_length=20, blank=True, default='')
    max_height = models.CharField(max_length=20, blank=True, default='')
    marital_status = models.CharField(max_length=50, blank=True, default='')
    income_range = models.CharField(max_length=100, blank=True, default='')
    
    # Preferred Preferences
    religion = models.CharField(max_length=100, blank=True, default='')
    weight = models.CharField(max_length=50, blank=True, default='')
    mother_tongue = models.CharField(max_length=100, blank=True, default='')
    diet = models.CharField(max_length=100, blank=True, default='')
    smoking = models.CharField(max_length=100, blank=True, default='')
    drinking = models.CharField(max_length=100, blank=True, default='')
    disability_preference = models.CharField(max_length=100, blank=True, default='')
    family_type = models.CharField(max_length=100, blank=True, default='')
    family_values = models.CharField(max_length=100, blank=True, default='')
    family_status = models.CharField(max_length=100, blank=True, default='')
    
    # Advanced Preferences
    horoscope_matching = models.CharField(max_length=50, blank=True, default='')
    manglik = models.CharField(max_length=50, blank=True, default='')
    willing_to_relocate = models.CharField(max_length=50, blank=True, default='')
    abroad_preference = models.CharField(max_length=50, blank=True, default='')
    preferred_communities = models.TextField(blank=True, default='')  # Comma-separated community IDs
    preferred_languages = models.TextField(blank=True, default='')  # Comma-separated languages
    profile_verified_only = models.BooleanField(default=False)
    photo_required = models.BooleanField(default=False)
    recently_active_only = models.BooleanField(default=False)
    preferences_data = models.JSONField(default=dict, blank=True, null=True)

    def __str__(self):
        if self.profile:
            return f"Partner Preferences for {self.profile.name}"
        return f"Partner Preferences for user {self.user.username if self.user else 'Unknown'}"

    def save(self, *args, **kwargs):
        try:
            from api.preference_engine import PreferenceEngine
            PreferenceEngine.sync_columns_to_json(self)
        except Exception:
            pass
        super().save(*args, **kwargs)
        try:
            from api.preference_engine import PreferenceEngine
            if self.profile:
                PreferenceEngine.invalidate_cache_for_profile(self.profile.id)
            elif self.user:
                prof = MatrimonyProfile.objects.filter(user=self.user, deleted_at__isnull=True).first()
                if prof:
                    PreferenceEngine.invalidate_cache_for_profile(prof.id)
        except Exception:
            pass

class ProfileVisibility(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile_visibility')
    visibility_type = models.CharField(max_length=100, default='Public Within Community')
    min_age = models.IntegerField(null=True, blank=True)
    max_age = models.IntegerField(null=True, blank=True)
    allowed_gender = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Profile Visibility for {self.user.username}"

class InterestRequest(models.Model):
    STATUSES = (
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
    )
    sender = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE, related_name='sent_interests')
    receiver = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE, related_name='received_interests')
    status = models.CharField(max_length=50, choices=STATUSES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interest from {self.sender.name} to {self.receiver.name} ({self.status})"

class BlockedUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking_users')
    blocked_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'blocked_user')

    def __str__(self):
        return f"{self.user.username} blocked {self.blocked_user.username}"

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matrimony_wishlist')
    profile = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'profile')

    def __str__(self):
        return f"{self.user.username} - Wishlist {self.profile.name}"

class ProfileView(models.Model):
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='profile_views_sent')
    profile = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE, related_name='profile_views_received')
    viewed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.viewer.username} viewed {self.profile.name} at {self.viewed_at}"

class MatrimonyAuditLog(models.Model):
    profile = models.ForeignKey(MatrimonyProfile, on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=255)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)

    def __str__(self):
        return f"{self.action} on {self.profile.name if self.profile else 'N/A'} at {self.timestamp}"


class Campaign(models.Model):
    title = models.CharField(max_length=255)
    goal = models.IntegerField()
    raised = models.IntegerField(default=0)
    img = models.ImageField(upload_to='campaigns/', null=True, blank=True)
    img_url = models.URLField(max_length=500, null=True, blank=True)
    desc = models.TextField()
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='campaigns')
    status = models.CharField(max_length=50, default='Active') # Draft, Pending Approval, Active, Completed, Closed, Expired
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    updates = models.TextField(blank=True, default='')
    
    def __str__(self):
        return self.title

class Donation(models.Model):
    donor = models.CharField(max_length=255)
    amount = models.IntegerField()
    date = models.DateField(auto_now_add=True)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='donations')
    note = models.TextField(blank=True)
    method = models.CharField(max_length=50) # UPI, Bank Transfer, Cash
    status = models.CharField(max_length=50, default='Success')
    is_anonymous = models.BooleanField(default=False)
    email = models.EmailField(blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    receipt_no = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return f"{self.donor} - ₹{self.amount} for {self.campaign.title}"

class News(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)
    img = models.ImageField(upload_to='news/', null=True, blank=True)
    img_url = models.URLField(max_length=500, null=True, blank=True)
    excerpt = models.TextField()
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='news')
    visibility_scope = models.CharField(max_length=50, default='COMMUNITY_ONLY')
    
    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.img and hasattr(self.img, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_img = False
            if not self.pk:
                is_new_img = True
            else:
                try:
                    orig = News.objects.get(pk=self.pk)
                    if orig.img != self.img:
                        is_new_img = True
                except News.DoesNotExist:
                    is_new_img = True
            if is_new_img:
                check_storage_quota(self.community, self.img.size)
        super().save(*args, **kwargs)

class Family(models.Model):
    head = models.CharField(max_length=255)
    village = models.CharField(max_length=100, blank=True, default='')
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='families')
    member = models.ForeignKey('Member', on_delete=models.CASCADE, related_name='family_groups', null=True, blank=True)
    
    def __str__(self):
        return f"Family of {self.head} ({self.village})"

    def save(self, *args, **kwargs):
        if not self.pk:
            from api.quota_engine import check_quota_limit
            check_quota_limit(self.community, 'max_family_members')
        super().save(*args, **kwargs)

class FamilyMember(models.Model):
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=255)
    relation = models.CharField(max_length=100, default='Other')
    birthdate = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    occupation = models.CharField(max_length=100, blank=True, default='')
    
    # Extended fields
    education = models.CharField(max_length=100, blank=True, null=True)
    school = models.CharField(max_length=255, blank=True, null=True)
    college = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    field_of_study = models.CharField(max_length=255, blank=True, null=True)
    passing_year = models.CharField(max_length=50, blank=True, null=True)
    profession_type = models.CharField(max_length=100, blank=True, null=True)
    job_title = models.CharField(max_length=255, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    industry = models.CharField(max_length=255, blank=True, null=True)
    salary = models.CharField(max_length=100, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_category = models.CharField(max_length=255, blank=True, null=True)
    gst_no = models.CharField(max_length=100, blank=True, null=True)
    business_years = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} - {self.relation} of {self.family.head}"

class EventRegistration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    attendees = models.IntegerField(default=1)
    family_members_attending = models.TextField(blank=True, default='')
    special_notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, default='Registered') # Registered, Present, Absent
    registration_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} registered for {self.event.title}"

class CommunityApprovalHistory(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='approval_history')
    approval_level = models.CharField(max_length=100) # e.g. "Super Admin", "Parent Community Admin", "Submission"
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    approved_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=100)
    remarks = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.community.name} - {self.status} ({self.approval_level})"

class FeatureMaster(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    monthly_price = models.IntegerField(default=0)
    quarterly_price = models.IntegerField(default=0)
    half_yearly_price = models.IntegerField(default=0)
    yearly_price = models.IntegerField(default=0)
    lifetime_price = models.IntegerField(default=0)
    currency = models.CharField(max_length=10, default="INR")
    gst_percentage = models.IntegerField(default=18)
    discount_percentage = models.IntegerField(default=0)
    
    display_badge = models.CharField(max_length=50, blank=True, default='') # Popular, Recommended, Best Value, etc.
    is_popular = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    is_best_value = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    is_internal = models.BooleanField(default=False)
    is_enterprise = models.BooleanField(default=False)
    
    color_theme = models.CharField(max_length=100, default='from-blue-600 to-indigo-700')
    display_order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    
    trial_days = models.IntegerField(default=14)
    grace_period_days = models.IntegerField(default=7)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Legacy fields
    member_limit = models.IntegerField(default=1000)
    storage = models.CharField(max_length=50, default="1 GB")
    modules = models.JSONField(default=dict, blank=True)

    # License Limits (Section 3)
    max_members = models.IntegerField(default=1000)
    max_communities = models.IntegerField(default=10)
    max_family_members = models.IntegerField(default=5000)
    max_committee_members = models.IntegerField(default=100)
    max_admin_users = models.IntegerField(default=5)
    max_staff_users = models.IntegerField(default=10)
    max_events = models.IntegerField(default=50)
    max_venues = models.IntegerField(default=5)
    max_donations = models.IntegerField(default=100000)
    max_jobs = models.IntegerField(default=100)
    max_businesses = models.IntegerField(default=100)
    max_matrimony_profiles = models.IntegerField(default=500)
    max_gallery_images = models.IntegerField(default=1000)
    max_storage_gb = models.IntegerField(default=10)
    max_api_calls = models.IntegerField(default=100000)
    max_notifications = models.IntegerField(default=50000)
    max_sms = models.IntegerField(default=1000)
    max_email_credits = models.IntegerField(default=10000)
    max_whatsapp_credits = models.IntegerField(default=500)

    # Advanced Features (Section 5)
    custom_branding = models.BooleanField(default=False)
    community_logo = models.BooleanField(default=False)
    domain_mapping = models.BooleanField(default=False)
    white_label = models.BooleanField(default=False)
    custom_login = models.BooleanField(default=False)
    custom_email_templates = models.BooleanField(default=False)
    custom_sms_templates = models.BooleanField(default=False)
    custom_whatsapp = models.BooleanField(default=False)
    custom_theme = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class ModulePermissionDefinition(models.Model):
    feature = models.ForeignKey(FeatureMaster, related_name='permission_definitions', on_delete=models.CASCADE)
    code = models.CharField(max_length=100) # e.g. "view_profiles"
    name = models.CharField(max_length=200) # e.g. "View Profiles"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('feature', 'code')

    def __str__(self):
        return f"{self.feature.name} - {self.name}"

class PlanFeaturePermission(models.Model):
    plan = models.ForeignKey(SubscriptionPlan, related_name='feature_permissions', on_delete=models.CASCADE)
    feature = models.ForeignKey(FeatureMaster, on_delete=models.CASCADE)
    
    allowed_operations = models.JSONField(default=list, blank=True)
    
    can_view = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_export = models.BooleanField(default=False)
    can_import = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    can_reject = models.BooleanField(default=False)
    can_assign = models.BooleanField(default=False)
    can_manage = models.BooleanField(default=False)

    class Meta:
        unique_together = ('plan', 'feature')

    def __str__(self):
        return f"{self.plan.name} - {self.feature.name}"

class CommunitySubscription(models.Model):
    community = models.OneToOneField(Community, related_name='subscription', on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=50, default='Trial') # Trial, Active, Grace Period, Expired, Suspended
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    grace_period_ends_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    limits_override = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.community.name} - {self.plan.name if self.plan else 'No Plan'}"

class SubscriptionHistory(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='subscription_history')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100) # Created, Renewed, Upgraded, Cancelled, Refunded
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    billing_cycle = models.CharField(max_length=50, blank=True, default='') # Monthly, Yearly, etc.
    payment_method = models.CharField(max_length=100, blank=True, default='')
    transaction_id = models.CharField(max_length=100, blank=True, default='')
    invoice_no = models.CharField(max_length=100, blank=True, default='')
    gst_invoice_no = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.community.name} - {self.action} on {self.created_at}"

class SystemQuota(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PlanAddon(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100, default='Core')
    target_limit = models.ForeignKey(SystemQuota, on_delete=models.CASCADE, related_name='addons', null=True, blank=True)
    increment = models.IntegerField(default=0)
    price = models.IntegerField(default=0)
    billing_cycle = models.CharField(max_length=50, default='Monthly') # Monthly, Quarterly, Yearly, Lifetime
    status = models.CharField(max_length=50, default='Active') # Active, Inactive
    compatible_plans = models.ManyToManyField(SubscriptionPlan, blank=True, related_name='addons')
    priority = models.IntegerField(default=0)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class FeatureUsage(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='feature_usages')
    metric = models.CharField(max_length=100) # members, storage, sms, etc.
    current_usage = models.IntegerField(default=0)
    max_limit = models.IntegerField(default=0)
    last_reset_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('community', 'metric')

    def __str__(self):
        return f"{self.community.name} - {self.metric}: {self.current_usage}/{self.max_limit}"

class UsageCounter(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE)
    metric = models.CharField(max_length=100)
    count = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.community.name} - {self.metric}: {self.count}"

class SubscriptionAuditLog(models.Model):
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    community = models.ForeignKey(Community, on_delete=models.SET_NULL, null=True, blank=True)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Audit log - {self.field_name} at {self.date}"

class Role(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    permissions = models.JSONField(default=dict)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=50, default='info') # e.g. "community_registration", "approval", "rejection"

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"

class Advertisement(models.Model):
    STATUSES = (
        ('Active', 'Active'),
        ('Paused', 'Paused'),
        ('Expired', 'Expired'),
    )
    SLOTS = (
        ('Hero Banner', 'Hero Banner'),
        ('Sidebar Top', 'Sidebar Top'),
        ('Sidebar Bottom', 'Sidebar Bottom'),
        ('Footer', 'Footer'),
        ('Content Inline', 'Content Inline'),
    )
    slot = models.CharField(max_length=50, choices=SLOTS)
    advertiser = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    image = models.ImageField(upload_to='ads/', null=True, blank=True)
    destination_url = models.URLField(max_length=500, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUSES, default='Active')
    priority = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.advertiser} ({self.slot})"

class Gallery(models.Model):
    title = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='gallery/', null=True, blank=True)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='gallery_photos')
    visibility_scope = models.CharField(max_length=50, default='COMMUNITY_ONLY')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Gallery Photo {self.id} for {self.community.name}"

    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_image = False
            if not self.pk:
                is_new_image = True
            else:
                try:
                    orig = Gallery.objects.get(pk=self.pk)
                    if orig.image != self.image:
                        is_new_image = True
                except Gallery.DoesNotExist:
                    is_new_image = True
            if is_new_image:
                check_storage_quota(self.community, self.image.size)
        super().save(*args, **kwargs)

class EmailTemplate(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )
    name = models.CharField(max_length=100, unique=True)
    subject = models.CharField(max_length=255)
    html_content = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class EmailLog(models.Model):
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    trigger_event = models.CharField(max_length=100)
    status = models.CharField(max_length=50) # e.g. "Sent Successfully", "Failed"
    sent_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.recipient} - {self.subject} - {self.status}"

class CommunityActivityLog(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='activity_logs')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    changed_fields = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Activity for {self.community.name} at {self.created_at}"

class MessageRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    sender = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='sent_message_requests')
    receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='received_message_requests')
    subject = models.CharField(max_length=255, blank=True, null=True)
    introduction_message = models.TextField()
    reason = models.CharField(max_length=100)
    custom_reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Req: {self.sender.name} -> {self.receiver.name} ({self.status})"

class Conversation(models.Model):
    participant_1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='conversations_as_p1')
    participant_2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='conversations_as_p2')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat: {self.participant_1.name} & {self.participant_2.name}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    image = models.ImageField(upload_to='chat_images/', blank=True, null=True)
    file = models.FileField(upload_to='chat_files/', blank=True, null=True)
    is_seen = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_by_sender = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    def __str__(self):
        return f"Msg from {self.sender.name} at {self.created_at}"

class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'member')

    def __str__(self):
        return f"{self.member.name} reacted {self.emoji} to message {self.message.id}"


# =========================================================
# PHASE 1 & 2: PROPERTY & RESOURCE SETUP
# =========================================================
class BookingProperty(models.Model):
    PROPERTY_TYPES = (
        ('Marriage Hall', 'Marriage Hall'),
        ('Community Hall', 'Community Hall'),
        ('Guest House', 'Guest House'),
        ('Dharamshala', 'Dharamshala'),
        ('Rooms', 'Rooms'),
        ('Parking', 'Parking'),
        ('Kitchen', 'Kitchen'),
        ('Conference Hall', 'Conference Hall'),
        ('Garden', 'Garden'),
        ('Community Center', 'Community Center'),
        ('Clubhouse', 'Clubhouse'),
        ('Other', 'Other')
    )
    OWNERSHIP_CHOICES = (
        ('Community Owned', 'Community Owned'),
        ('Rented', 'Rented')
    )
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Pending Approval', 'Pending Approval'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Inactive', 'Inactive')
    )

    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='booking_properties')
    name = models.CharField(max_length=255)
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPES, default='Community Center')
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending Approval')
    ownership = models.CharField(max_length=50, choices=OWNERSHIP_CHOICES, default='Community Owned')
    rejection_reason = models.TextField(blank=True, default='')
    notified = models.BooleanField(default=False)

    # Location
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=20)
    google_map_url = models.URLField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Contact
    contact_person_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=50)
    alternate_phone = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, null=True)

    # Media
    photos = models.JSONField(default=list, blank=True)  # List of URLs
    videos = models.JSONField(default=list, blank=True)
    brochure_pdf = models.FileField(upload_to='property_brochures/', null=True, blank=True)

    # Rules & Amenities
    rules = models.TextField(blank=True, help_text="Free text rules e.g. No alcohol, No loud music after 10 PM")
    amenities = models.JSONField(default=list, blank=True) # e.g. ["Parking", "Kitchen", "Garden", "WiFi", "AC"]

    # Policies
    cancellation_allowed = models.BooleanField(default=True)
    cancellation_hours = models.IntegerField(default=24)
    refund_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    refund_policy_tiers = models.JSONField(default=list, blank=True)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    approval_required = models.BooleanField(default=True)
    manual_payment_allowed = models.BooleanField(default=True)

    # Notes
    terms_conditions = models.TextField(blank=True, default='')
    internal_notes = models.TextField(blank=True, default='')

    # Booking Rules
    booking_window_days = models.IntegerField(default=365, help_text="Up to how many days in advance")
    min_booking_duration_hours = models.IntegerField(default=2)
    max_booking_duration_days = models.IntegerField(default=7)
    
    # Financials
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, help_text="Default tax % applied to bookings")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.community.name}"

    def save(self, *args, **kwargs):
        if self.brochure_pdf and hasattr(self.brochure_pdf, 'size'):
            from api.quota_engine import check_storage_quota
            is_new_pdf = False
            if not self.pk:
                is_new_pdf = True
            else:
                try:
                    orig = BookingProperty.objects.get(pk=self.pk)
                    if orig.brochure_pdf != self.brochure_pdf:
                        is_new_pdf = True
                except BookingProperty.DoesNotExist:
                    is_new_pdf = True
            if is_new_pdf:
                check_storage_quota(self.community, self.brochure_pdf.size)
        super().save(*args, **kwargs)


class PropertyResource(models.Model):
    BOOKING_TYPES = (
        ('Hourly', 'Hourly'),
        ('Half Day', 'Half Day'),
        ('Full Day', 'Full Day'),
        ('Fixed', 'Fixed'),
        ('Custom', 'Custom')
    )
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Maintenance', 'Maintenance')
    )

    property = models.ForeignKey(BookingProperty, on_delete=models.CASCADE, related_name='resources')
    name = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100, help_text="e.g. Main Hall, Room, Kitchen, Parking")
    capacity = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    
    media = models.JSONField(default=list, blank=True) # URLs
    
    booking_type = models.CharField(max_length=50, choices=BOOKING_TYPES, default='Full Day')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')

    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    half_day_hours = models.IntegerField(default=6)
    half_day_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    full_day_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    min_booking_duration_hours = models.IntegerField(default=1)
    max_booking_duration_hours = models.IntegerField(default=24)
    setup_buffer_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cleanup_buffer_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    amenities = models.JSONField(blank=True, default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.property.name})"

class ResourceDependency(models.Model):
    DEPENDENCY_TYPES = (
        ('parent_child', 'Parent -> Child Dependency'),
        ('combination', 'Combination Dependency'),
    )
    resource = models.ForeignKey(PropertyResource, on_delete=models.CASCADE, related_name='dependencies')
    requires = models.ForeignKey(PropertyResource, on_delete=models.CASCADE, related_name='required_by')
    dependency_type = models.CharField(max_length=20, choices=DEPENDENCY_TYPES, default='parent_child')

    def __str__(self):
        return f"{self.resource.name} requires {self.requires.name}"


# =========================================================
# PHASE 3: PRICING CONFIGURATION
# =========================================================
class ResourcePricing(models.Model):
    MEMBER_TYPES = (
        ('VIP', 'VIP'),
        ('Verified Member', 'Verified Member'),
        ('Non Member', 'Non Member'),
        ('Committee', 'Committee')
    )
    SEASONALITY = (
        ('Weekdays', 'Weekdays'),
        ('Weekends', 'Weekends'),
        ('Festivals', 'Festivals'),
        ('Seasonal', 'Seasonal'),
        ('Standard', 'Standard')
    )

    resource = models.ForeignKey(PropertyResource, on_delete=models.CASCADE, related_name='pricing')
    member_type = models.CharField(max_length=50, choices=MEMBER_TYPES, default='Non Member')
    seasonality = models.CharField(max_length=50, choices=SEASONALITY, default='Standard')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.resource.name} - {self.member_type} ({self.seasonality}): {self.price}"


# =========================================================
# PHASE 4: AVAILABILITY MANAGEMENT & LOCKING
# =========================================================
class ResourceLock(models.Model):
    resource = models.ForeignKey(PropertyResource, on_delete=models.CASCADE, related_name='locks')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    locked_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return timezone.now() < self.expires_at


# =========================================================
# PHASE 5 TO 9: BOOKING FLOW & CHECK-IN
# =========================================================
class VenueBooking(models.Model):
    PAYMENT_STATUSES = (
        ('Pending', 'Pending'),
        ('Under Review', 'Under Review'),
        ('Paid', 'Paid'),
        ('Rejected', 'Rejected'),
        ('Refunded', 'Refunded')
    )
    BOOKING_STATUSES = (
        ('Draft', 'Draft'),
        ('Pending Approval', 'Pending Approval'),
        ('Pending Payment', 'Pending Payment'),
        ('Confirmed', 'Confirmed'), # After Paid
        ('Checked In', 'Checked In'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('Refund Requested', 'Refund Requested'),
        ('Refunded', 'Refunded'),
        ('Rejected', 'Rejected')
    )
    PAYMENT_METHODS = (
        ('Cash', 'Cash'),
        ('UPI', 'UPI'),
        ('Bank Transfer', 'Bank Transfer'),
    )

    booking_number = models.CharField(max_length=50, unique=True, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    receipt_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    property = models.ForeignKey(BookingProperty, on_delete=models.CASCADE, related_name='bookings')
    resources = models.ManyToManyField(PropertyResource, related_name='bookings')
    is_full_property = models.BooleanField(default=False)
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='venue_bookings')

    
    # Event Details
    event_name = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100)
    purpose = models.CharField(max_length=255, blank=True)
    expected_guests = models.IntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Guest details (if booked by someone else or non-member)
    guest_name = models.CharField(max_length=255, blank=True)
    guest_email = models.EmailField(blank=True, null=True)
    guest_phone = models.CharField(max_length=20, blank=True)

    # Documents
    id_proof = models.FileField(upload_to='booking_docs/', null=True, blank=True)
    invitation_card = models.FileField(upload_to='booking_docs/', null=True, blank=True)
    approval_letter = models.FileField(upload_to='booking_docs/', null=True, blank=True)

    # Pricing
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    extra_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    pricing_breakdown = models.JSONField(default=dict, blank=True)

    # Status
    status = models.CharField(max_length=50, choices=BOOKING_STATUSES, default='Pending Approval')
    payment_status = models.CharField(max_length=50, choices=PAYMENT_STATUSES, default='Pending')

    # Payment details
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS, blank=True, default='')
    payment_screenshot = models.ImageField(upload_to='booking_payments/', null=True, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)
    payment_verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_venue_payments')

    # QR and Check-in
    qr_code_data = models.CharField(max_length=500, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.booking_number:
            import uuid
            import datetime
            year = datetime.datetime.now().year
            self.booking_number = f"BK-{year}-{uuid.uuid4().hex[:6].upper()}"
        if not self.invoice_number:
            self.invoice_number = f"INV-{self.booking_number.replace('BK-', '')}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_number} - {self.event_name}"


# =========================================================
# PHASE 10 & 11: EVENT COMPLETION, INSPECTION & DEPOSITS
# =========================================================
class BookingInspection(models.Model):
    DEPOSIT_STATUSES = (
        ('Pending', 'Pending'),
        ('Full Refund', 'Full Refund'),
        ('Partial Refund', 'Partial Refund'),
        ('Forfeited', 'Forfeited')
    )

    booking = models.OneToOneField(VenueBooking, on_delete=models.CASCADE, related_name='inspection')
    
    damage_found = models.BooleanField(default=False)
    cleaning_required = models.BooleanField(default=False)
    extra_electricity_used = models.BooleanField(default=False)
    equipment_damage = models.BooleanField(default=False)
    
    cleaning_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    damage_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    electricity_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    total_additional_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    deposit_settlement_status = models.CharField(max_length=50, choices=DEPOSIT_STATUSES, default='Pending')
    settlement_notes = models.TextField(blank=True)
    
    inspected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_additional_charges = self.cleaning_charges + self.damage_charges + self.electricity_charges
        super().save(*args, **kwargs)


# =========================================================
# PHASE 12 & 13: CANCELLATIONS, REFUNDS & WAITING LIST
# =========================================================
class BookingRefund(models.Model):
    booking = models.ForeignKey(VenueBooking, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    refund_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=50, choices=(('Requested', 'Requested'), ('Approved', 'Approved'), ('Rejected', 'Rejected'), ('Processed', 'Processed')), default='Requested')
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class BookingWaitingList(models.Model):
    property = models.ForeignKey(BookingProperty, on_delete=models.CASCADE)
    resource = models.ForeignKey(PropertyResource, on_delete=models.CASCADE, null=True, blank=True)
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    position = models.IntegerField(default=1)
    notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


# =========================================================
# SIGNALS: AUTO-CALCULATE AGE AND SYNCHRONIZE MEMBER / MATRIMONY PROFILE DATA
# =========================================================
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from datetime import date

def _recalculate_age_from_dob(dob):
    if not dob:
        return None
    today = date.today()
    try:
        if isinstance(dob, str):
            from django.utils.dateparse import parse_date
            dob = parse_date(dob)
        if not dob:
            return None
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None

@receiver(pre_save, sender=Member)
def auto_calculate_member_age(sender, instance, **kwargs):
    if instance.birthdate:
        computed_age = _recalculate_age_from_dob(instance.birthdate)
        if computed_age is not None:
            instance.age = computed_age

@receiver(pre_save, sender=FamilyMember)
def auto_calculate_familymember_age(sender, instance, **kwargs):
    if instance.birthdate:
        computed_age = _recalculate_age_from_dob(instance.birthdate)
        if computed_age is not None:
            instance.age = computed_age

@receiver(pre_save, sender=MatrimonyProfile)
def auto_calculate_matrimony_age(sender, instance, **kwargs):
    if instance.dob:
        computed_age = _recalculate_age_from_dob(instance.dob)
        if computed_age is not None:
            instance.age = computed_age

@receiver(post_save, sender=Member)
def sync_member_to_matrimony(sender, instance, **kwargs):
    if getattr(instance, '_syncing', False):
        instance._syncing = False
        return
    if instance.user:
        try:
            # Find the "self" matrimony profile(s)
            matrimony_profiles = MatrimonyProfile.objects.filter(user=instance.user, family_member__isnull=True)
            
            for profile in matrimony_profiles:
                if getattr(profile, '_syncing', False):
                    profile._syncing = False
                    continue
                # Sync core fields
                profile.name = instance.name
                
                # Gender mapping
                if instance.gender:
                    if instance.gender.lower() == 'male':
                        profile.gender = 'Groom'
                    elif instance.gender.lower() == 'female':
                        profile.gender = 'Bride'
                    else:
                        profile.gender = instance.gender
                
                profile.dob = instance.birthdate
                profile.age = instance.age or 18
                if instance.community:
                    profile.community = instance.community
                profile.state = instance.state
                profile.city = instance.village
                profile.contact_phone = instance.phone
                profile.contact_email = instance.email
                profile.contact_name = instance.name
                
                # Sync caste and sub-caste from community
                if instance.community:
                    profile.caste = instance.community.caste or ''
                    profile.sub_caste = instance.community.sub_caste or ''
                
                # Sync profile photo
                if instance.avatar:
                    profile.photo = instance.avatar
                if instance.avatar_url:
                    profile.photo_url = instance.avatar_url
                
                profile._syncing = True
                try:
                    profile.save()
                finally:
                    profile._syncing = False
                
                # Sync to MatrimonyPhoto
                if instance.avatar or instance.avatar_url:
                    photo_obj = MatrimonyPhoto.objects.filter(profile=profile, category='Profile Photo').first()
                    if photo_obj:
                        if instance.avatar:
                            photo_obj.image = instance.avatar
                        if instance.avatar_url:
                            photo_obj.image_url = instance.avatar_url
                        photo_obj.save()
                    else:
                        MatrimonyPhoto.objects.create(
                            profile=profile,
                            image=instance.avatar,
                            image_url=instance.avatar_url,
                            category='Profile Photo',
                            is_private=False,
                            order=0
                        )
                        
        except Exception as e:
            print(f"[sync_member_to_matrimony] Error: {e}")

@receiver(post_save, sender=FamilyMember)
def sync_familymember_to_matrimony(sender, instance, **kwargs):
    if getattr(instance, '_syncing', False):
        instance._syncing = False
        return
    try:
        profile = MatrimonyProfile.objects.filter(family_member=instance).first()
        if profile and not getattr(profile, '_syncing', False):
            profile.name = instance.name
            profile.dob = instance.birthdate
            profile.age = instance.age or 18
            profile.profession = instance.occupation
            profile.education = instance.education or ''
            profile._syncing = True
            try:
                profile.save()
            finally:
                profile._syncing = False
    except Exception as e:
        print(f"[sync_familymember_to_matrimony] Error: {e}")

@receiver(post_save, sender=MatrimonyProfile)
def sync_matrimony_to_member_or_family(sender, instance, **kwargs):
    if getattr(instance, '_syncing', False):
        instance._syncing = False
        return
    try:
        if instance.user and instance.family_member is None:
            # Sync to Member profile
            member = getattr(instance.user, 'member_profile', None)
            if member and not getattr(member, '_syncing', False):
                member.name = instance.name
                
                # Gender mapping
                if instance.gender == 'Groom':
                    member.gender = 'Male'
                elif instance.gender == 'Bride':
                    member.gender = 'Female'
                
                member.birthdate = instance.dob
                member.age = instance.age
                member.community = instance.community
                member.state = instance.state
                member.village = instance.city
                member.phone = instance.contact_phone
                member.email = instance.contact_email
                
                if instance.photo:
                    member.avatar = instance.photo
                if instance.photo_url:
                    member.avatar_url = instance.photo_url
                
                member._syncing = True
                try:
                    member.save()
                finally:
                    member._syncing = False
        elif instance.family_member:
            # Sync to FamilyMember profile
            f_member = instance.family_member
            if not getattr(f_member, '_syncing', False):
                f_member.name = instance.name
                f_member.birthdate = instance.dob
                f_member.age = instance.age
                f_member.occupation = instance.profession
                f_member.education = instance.education
                f_member._syncing = True
                try:
                    f_member.save()
                finally:
                    f_member._syncing = False
            
    except Exception as e:
        print(f"[sync_matrimony_to_member_or_family] Error: {e}")

@receiver(post_save, sender=MatrimonyProfile)
def align_partner_preference_gender(sender, instance, **kwargs):
    try:
        pref = PartnerPreference.objects.filter(profile=instance).first()
        if not pref:
            return
        # Normalize and compare
        own_gender = (instance.gender or '').lower()
        pref_gender = (pref.gender or '').lower()
        
        is_own_male = own_gender in ('groom', 'male')
        is_pref_male = pref_gender in ('groom', 'male')
        is_pref_female = pref_gender in ('bride', 'female')
        
        # If preferred gender is empty, or matches own gender type, swap to opposite
        if not pref_gender or (is_own_male and is_pref_male) or (not is_own_male and is_pref_female):
            pref.gender = 'Bride' if is_own_male else 'Groom'
            pref.save()
    except Exception as e:
        print(f"[align_partner_preference_gender] Error: {e}")


import uuid
from django.core.exceptions import ValidationError
from django.db.models.signals import post_delete

class ApplicationModule(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    module_code = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100)
    icon = models.CharField(max_length=100, blank=True, default='')
    route = models.CharField(max_length=255, unique=True, null=True, blank=True)
    parent_module = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_modules')
    sort_order = models.IntegerField(default=0)
    is_sidebar_module = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    
    # Feature Flags
    supports_subscription = models.BooleanField(default=False)
    supports_permissions = models.BooleanField(default=False)
    supports_usage_counter = models.BooleanField(default=False)
    supports_analytics = models.BooleanField(default=False)
    supports_audit_logs = models.BooleanField(default=False)
    supports_notifications = models.BooleanField(default=False)
    supports_export = models.BooleanField(default=False)
    supports_import = models.BooleanField(default=False)
    supports_search = models.BooleanField(default=False)
    supports_api = models.BooleanField(default=False)
    supports_mobile = models.BooleanField(default=False)
    supports_dashboard_widgets = models.BooleanField(default=False)
    supports_reports = models.BooleanField(default=False)
    supports_approval_workflow = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        super().clean()
        # Check sort_order uniqueness among non-deleted active modules
        qs = ApplicationModule.objects.filter(sort_order=self.sort_order, deleted_at__isnull=True, is_archived=False)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.exists() and self.is_active:
            raise ValidationError({'sort_order': f'Sort order {self.sort_order} must be unique among active modules.'})

    def __str__(self):
        return f"{self.display_name} ({self.module_code})"

class ApplicationAction(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class ModuleAction(models.Model):
    module = models.ForeignKey(ApplicationModule, on_delete=models.CASCADE, related_name='module_actions')
    action = models.ForeignKey(ApplicationAction, on_delete=models.CASCADE)
    is_custom = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('module', 'action')

    def __str__(self):
        return f"{self.module.module_code} - {self.action.name}"

class ApplicationModuleAuditLog(models.Model):
    module_code = models.CharField(max_length=100)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.module_code} - {self.field_name} at {self.timestamp}"

@receiver(post_save, sender=ApplicationModule)
def sync_module_to_feature_master(sender, instance, **kwargs):
    try:
        if instance.deleted_at or not instance.is_active or instance.is_archived:
            # Deactivate the FeatureMaster
            FeatureMaster.objects.filter(code=instance.module_code).update(active=False)
        else:
            # Create or update FeatureMaster
            FeatureMaster.objects.update_or_create(
                code=instance.module_code,
                defaults={
                    'name': instance.display_name,
                    'description': instance.description,
                    'active': instance.is_active
                }
            )
    except Exception as e:
        print(f"[sync_module_to_feature_master] Error: {e}")

@receiver(post_delete, sender=ApplicationModule)
def delete_feature_master(sender, instance, **kwargs):
    try:
        FeatureMaster.objects.filter(code=instance.module_code).delete()
    except Exception as e:
        print(f"[delete_feature_master] Error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: MEMBER PREMIUM SUBSCRIPTION SYSTEM
# ─────────────────────────────────────────────────────────────────────────────

class PremiumFeatureRegistry(models.Model):
    module = models.CharField(max_length=100)  # matrimony, messaging, directory, business, jobs, events, donations, property, ads, ai
    feature_name = models.CharField(max_length=200)
    feature_code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=50, default='active')
    icon = models.CharField(max_length=100, blank=True, default='star')
    dependency = models.CharField(max_length=200, blank=True, default='')
    version = models.CharField(max_length=20, default='1.0')

    class Meta:
        verbose_name = "Premium Feature Registry"
        verbose_name_plural = "Premium Feature Registries"

    def __str__(self):
        return f"{self.module} - {self.feature_name} ({self.feature_code})"


class MemberPremiumPlan(models.Model):
    """Dynamic Premium Plan - replaces all hardcoded plan types."""
    PLAN_TYPE_CHOICES = [
        ('free', 'Free'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
        ('diamond', 'Diamond'),
        ('lifetime', 'Lifetime'),
        ('custom', 'Custom'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    plan_type = models.CharField(max_length=30, choices=PLAN_TYPE_CHOICES, default='custom')
    short_description = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    display_badge = models.CharField(max_length=50, blank=True, default='')  # Popular, Recommended, Best Seller
    icon = models.CharField(max_length=50, blank=True, default='crown')  # lucide icon name
    color_theme = models.CharField(max_length=200, default='from-yellow-500 to-orange-600')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    display_order = models.IntegerField(default=0)
    is_hidden = models.BooleanField(default=False)
    is_popular = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_trial = models.BooleanField(default=False)

    # Pricing
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quarterly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    half_yearly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lifetime_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='INR')
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    coupon_applicable = models.BooleanField(default=True)

    # Lifecycle
    trial_days = models.IntegerField(default=0)
    grace_period_days = models.IntegerField(default=7)
    auto_renew_enabled = models.BooleanField(default=True)

    # Extra metadata stored as JSON (e.g. comparison table rows)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.name} ({self.code})"


class MemberPremiumFeature(models.Model):
    """Dynamic Feature Registry for Member Premium — nothing hardcoded."""
    CATEGORY_CHOICES = [
        ('matrimony', 'Matrimony'),
        ('messaging', 'Messaging'),
        ('business', 'Business'),
        ('jobs', 'Jobs'),
        ('events', 'Events'),
        ('property', 'Property Booking'),
        ('directory', 'Directory'),
        ('profile', 'Profile'),
        ('ai', 'AI Features'),
        ('marketplace', 'Marketplace'),
        ('support', 'Support'),
        ('donations', 'Donations'),
        ('ads', 'Advertisements'),
        ('committee', 'Committee'),
        ('attendance', 'Attendance'),
        ('subsidiaries', 'Subsidiaries'),
        ('venues', 'Venues'),
        ('other', 'Other'),
    ]
    LIMIT_TYPE_CHOICES = [
        ('unlimited', 'Unlimited'),
        ('per_month', 'Per Month'),
        ('per_year', 'Per Year'),
        ('lifetime', 'Lifetime'),
        ('count', 'Fixed Count'),
    ]

    plan = models.ForeignKey(MemberPremiumPlan, related_name='features', on_delete=models.CASCADE)
    feature_code = models.CharField(max_length=100)  # e.g. UNLIMITED_CHAT, BUSINESS_BOOST
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    icon = models.CharField(max_length=50, blank=True, default='star')
    display_badge = models.CharField(max_length=50, blank=True, default='')
    is_enabled = models.BooleanField(default=True)
    is_unlimited = models.BooleanField(default=False)
    limit_type = models.CharField(max_length=20, choices=LIMIT_TYPE_CHOICES, default='unlimited')
    limit_value = models.IntegerField(default=0)  # 0 = unlimited
    priority = models.IntegerField(default=0)
    upgrade_message = models.CharField(max_length=255, blank=True, default='Upgrade to unlock this feature')

    class Meta:
        unique_together = ('plan', 'feature_code')
        ordering = ['priority', 'id']

    def __str__(self):
        return f"{self.plan.name} – {self.name}"


class MemberPremiumBenefit(models.Model):
    """Human-readable benefits listed on the plan card / comparison table."""
    plan = models.ForeignKey(MemberPremiumPlan, related_name='benefits', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, blank=True, default='check')
    is_highlight = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    is_included = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.plan.name} – {self.title}"


class MemberPremiumAddon(models.Model):
    """Purchasable add-ons independent of subscription plan."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, blank=True, default='plus-circle')
    category = models.CharField(max_length=50, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='INR')
    billing_cycle = models.CharField(max_length=50, default='Monthly')  # Monthly, Quarterly, Yearly, Lifetime, One-time
    limit_type = models.CharField(max_length=100, blank=True, default='')
    limit_value = models.IntegerField(default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class MemberPremiumCoupon(models.Model):
    """Coupon codes for member premium plan purchases."""
    COUPON_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('flat', 'Flat Amount'),
        ('bogo', 'Buy One Get One'),
        ('festival', 'Festival'),
        ('referral', 'Referral'),
        ('community', 'Community'),
    ]
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    coupon_type = models.CharField(max_length=20, choices=COUPON_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    minimum_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    usage_limit = models.IntegerField(null=True, blank=True)  # null = unlimited
    used_count = models.IntegerField(default=0)
    expiry_date = models.DateTimeField(null=True, blank=True)
    applicable_plans = models.ManyToManyField(MemberPremiumPlan, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} – {self.coupon_type}"


class MemberPremiumSubscription(models.Model):
    """Core member subscription record - lifecycle managed here."""
    STATUS_CHOICES = [
        ('inactive', 'Inactive'),
        ('trial', 'Trial'),
        ('pending_payment', 'Pending Payment'),
        ('active', 'Active'),
        ('expiring_soon', 'Expiring Soon'),
        ('renewal_due', 'Renewal Due'),
        ('grace_period', 'Grace Period'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
        ('refunded', 'Refunded'),
    ]
    BILLING_CYCLE_CHOICES = [
        ('trial', 'Trial'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('half_yearly', 'Half Yearly'),
        ('yearly', 'Yearly'),
        ('lifetime', 'Lifetime'),
    ]

    member = models.ForeignKey(Member, related_name='premium_subscriptions', on_delete=models.CASCADE)
    plan = models.ForeignKey(MemberPremiumPlan, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='inactive')
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='monthly')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    grace_period_ends_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    coupon = models.ForeignKey(MemberPremiumCoupon, on_delete=models.SET_NULL, null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=100, blank=True, default='')
    transaction_id = models.CharField(max_length=200, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.member.name} – {self.plan.name if self.plan else 'No Plan'} ({self.status})"

    def is_currently_active(self):
        from django.utils import timezone
        now = timezone.now()
        if self.status == 'active' and self.end_date and self.end_date > now:
            return True
        if self.status == 'trial' and self.trial_ends_at and self.trial_ends_at > now:
            return True
        if self.status == 'grace_period' and self.grace_period_ends_at and self.grace_period_ends_at > now:
            return True
        if self.status == 'active' and self.end_date is None:  # Lifetime
            return True
        return False


class MemberFeatureUsage(models.Model):
    """Track per-feature usage per member for limit enforcement."""
    subscription = models.ForeignKey(MemberPremiumSubscription, related_name='feature_usages', on_delete=models.CASCADE)
    feature_code = models.CharField(max_length=100)
    used_count = models.IntegerField(default=0)
    reset_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('subscription', 'feature_code')

    def __str__(self):
        return f"{self.subscription.member.name} – {self.feature_code}: {self.used_count}"


class MemberPremiumTransaction(models.Model):
    """Every payment event (purchase, renewal, refund, upgrade)."""
    TRANSACTION_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('renewal', 'Renewal'),
        ('upgrade', 'Upgrade'),
        ('downgrade', 'Downgrade'),
        ('refund', 'Refund'),
        ('addon', 'Add-on Purchase'),
        ('cancellation', 'Cancellation'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    subscription = models.ForeignKey(MemberPremiumSubscription, related_name='transactions', on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, default='purchase')
    transaction_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='INR')
    payment_method = models.CharField(max_length=100, blank=True, default='')
    transaction_ref = models.CharField(max_length=200, blank=True, default='')
    gateway_response = models.JSONField(default=dict, blank=True)
    coupon = models.ForeignKey(MemberPremiumCoupon, on_delete=models.SET_NULL, null=True, blank=True)
    plan = models.ForeignKey(MemberPremiumPlan, on_delete=models.SET_NULL, null=True, blank=True)
    billing_cycle = models.CharField(max_length=30, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"TXN-{self.id} {self.transaction_type} ₹{self.total_amount}"


class MemberPremiumInvoice(models.Model):
    """GST-ready invoice per transaction."""
    transaction = models.OneToOneField(MemberPremiumTransaction, related_name='invoice', on_delete=models.CASCADE)
    invoice_no = models.CharField(max_length=100, unique=True)
    gst_invoice_no = models.CharField(max_length=100, blank=True, default='')
    invoice_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    pdf_url = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.invoice_no


class MemberAddonPurchase(models.Model):
    """Track individual add-on purchases by a member."""
    STATUS_CHOICES = [('active', 'Active'), ('expired', 'Expired'), ('cancelled', 'Cancelled')]
    member = models.ForeignKey(Member, related_name='addon_purchases', on_delete=models.CASCADE)
    addon = models.ForeignKey(MemberPremiumAddon, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    quantity = models.IntegerField(default=1)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.member.name} – {self.addon.name}"


class MemberPremiumAuditLog(models.Model):
    """Audit trail for all premium subscription changes."""
    ACTION_CHOICES = [
        ('plan_created', 'Plan Created'),
        ('plan_updated', 'Plan Updated'),
        ('plan_deleted', 'Plan Deleted'),
        ('subscription_activated', 'Subscription Activated'),
        ('subscription_cancelled', 'Subscription Cancelled'),
        ('subscription_expired', 'Subscription Expired'),
        ('subscription_renewed', 'Subscription Renewed'),
        ('subscription_upgraded', 'Subscription Upgraded'),
        ('subscription_downgraded', 'Subscription Downgraded'),
        ('subscription_suspended', 'Subscription Suspended'),
        ('feature_granted', 'Feature Granted'),
        ('feature_revoked', 'Feature Revoked'),
        ('coupon_applied', 'Coupon Applied'),
        ('addon_purchased', 'Add-on Purchased'),
        ('payment_received', 'Payment Received'),
        ('refund_processed', 'Refund Processed'),
        ('other', 'Other'),
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES, default='other')
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='premium_audit_logs')
    subscription = models.ForeignKey(MemberPremiumSubscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    plan = models.ForeignKey(MemberPremiumPlan, on_delete=models.SET_NULL, null=True, blank=True)
    field_name = models.CharField(max_length=100, blank=True, default='')
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} – {self.timestamp}"


# Phase 3.3: Community Subscription Management Models
class CommunityLicense(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='licenses')
    license_key = models.CharField(max_length=255, unique=True)
    version = models.CharField(max_length=50, default='1.0')
    status = models.CharField(max_length=50, default='Active')  # Active, Expired, Revoked, Suspended
    activated_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.community.name} - {self.license_key} ({self.status})"


class CommunityModuleAccess(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='module_accesses')
    module = models.ForeignKey(ApplicationModule, on_delete=models.CASCADE)
    enabled = models.BooleanField(default=True)
    purchased_addon = models.BooleanField(default=False)
    usage_limit = models.IntegerField(default=0)  # 0 means inherits from plan
    current_usage = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('community', 'module')

    def __str__(self):
        return f"{self.community.name} - {self.module.display_name}: {self.enabled}"


class CommunityUsage(models.Model):
    community = models.OneToOneField(Community, on_delete=models.CASCADE, related_name='usages')
    members = models.IntegerField(default=0)
    families = models.IntegerField(default=0)
    businesses = models.IntegerField(default=0)
    events = models.IntegerField(default=0)
    jobs = models.IntegerField(default=0)
    donations = models.IntegerField(default=0)
    gallery = models.IntegerField(default=0)
    properties = models.IntegerField(default=0)
    resources = models.IntegerField(default=0)
    bookings = models.IntegerField(default=0)
    storage = models.IntegerField(default=0)  # in MB
    api = models.IntegerField(default=0)
    sms = models.IntegerField(default=0)
    email = models.IntegerField(default=0)
    whatsapp = models.IntegerField(default=0)
    reports = models.IntegerField(default=0)
    analytics = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Usage for {self.community.name}"


class CommunityBilling(models.Model):
    community = models.OneToOneField(Community, on_delete=models.CASCADE, related_name='billing_info')
    billing_address = models.TextField(blank=True, default='')
    gst = models.CharField(max_length=50, blank=True, default='')
    pan = models.CharField(max_length=50, blank=True, default='')
    currency = models.CharField(max_length=10, default='INR')
    payment_method = models.CharField(max_length=100, blank=True, default='')
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    outstanding = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    credits = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Billing for {self.community.name}"


class CommunityInvoice(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='community_invoices')
    invoice_no = models.CharField(max_length=100, unique=True)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    coupon = models.CharField(max_length=100, blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=50, default='Paid')  # Paid, Pending, Failed, Refunded
    pdf_url = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice_no} ({self.amount})"


class CommunityTransaction(models.Model):
    invoice = models.ForeignKey(CommunityInvoice, on_delete=models.CASCADE, related_name='transactions')
    reference = models.CharField(max_length=255, unique=True)
    method = models.CharField(max_length=100)  # Card, UPI, Bank Transfer, Stripe, Razorpay
    gateway = models.CharField(max_length=100, default='Razorpay')
    status = models.CharField(max_length=50, default='Success')  # Success, Failed, Pending
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    failure_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference} ({self.status})"


class CommunityAddon(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='addons')
    addon = models.ForeignKey(PlanAddon, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    expiry = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default='Active')  # Active, Expired, Cancelled

    def __str__(self):
        return f"{self.community.name} - {self.addon.name} x {self.quantity}"


class CommunityAuditLog(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)  # Invoice Generated, Plan Changed, Renewed, Auto Renewal Enabled/Disabled, etc.
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    ip = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=255, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} on {self.timestamp}"


# PHASE 4: MEMBER PREMIUM SUPPORT & REWARD MODELS
class MemberPremiumReward(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='premium_rewards')
    reward_points = models.IntegerField(default=0)
    referral_rewards = models.IntegerField(default=0)
    cashback_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    loyalty_level = models.CharField(max_length=50, default='Bronze')  # Bronze, Silver, Gold, Platinum
    milestones_achieved = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.member.name} - {self.loyalty_level} (Points: {self.reward_points})"


class MemberPremiumSupportTicket(models.Model):
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='premium_tickets')
    ticket_no = models.CharField(max_length=50, unique=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TKT-{self.ticket_no}: {self.subject}"


# =========================================================
# SIGNALS: CACHE INVALIDATION FOR SIDEBAR & MEMBER LICENSE SYSTEM
# =========================================================
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver([post_save, post_delete], sender=MemberPremiumSubscription)
def clear_subscription_sidebar_cache(sender, instance, **kwargs):
    if instance.member and instance.member.user:
        cache.delete(f"sidebar_modules_{instance.member.user.id}")

@receiver([post_save, post_delete], sender=MemberPremiumPlan)
@receiver([post_save, post_delete], sender=MemberPremiumFeature)
@receiver([post_save, post_delete], sender=ApplicationModule)
def clear_all_sidebar_caches(sender, instance, **kwargs):
    cache.clear()






