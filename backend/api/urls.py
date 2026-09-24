from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, RegisterView, MeView,
    CommunityViewSet, MemberViewSet, CommitteeViewSet, EventViewSet,
    JobViewSet, BusinessViewSet, MatrimonyProfileViewSet, CampaignViewSet,
    DonationViewSet, NewsViewSet, FamilyViewSet, FamilyMemberViewSet,
    EventRegistrationViewSet, NotificationViewSet, CommunityApprovalHistoryViewSet,
    SubscriptionPlanViewSet, RoleViewSet, AdvertisementViewSet, GalleryViewSet,
    ForgotPasswordView, ResetPasswordView, ChangePasswordView, VerifyForgotOTPView,
    RegisterSendOTPView, RegisterVerifyOTPView, JobApplicationViewSet,
    MessageRequestViewSet, ConversationViewSet, MessageViewSet,
    BookingPropertyViewSet, PropertyResourceViewSet, ResourcePricingViewSet,
    VenueBookingViewSet, BookingInspectionViewSet, BookingRefundViewSet, BookingWaitingListViewSet,
    ResourceLockViewSet, ResourceDependencyViewSet,
    FeatureMasterViewSet, PlanFeaturePermissionViewSet, CommunitySubscriptionViewSet,
    SubscriptionHistoryViewSet, PlanAddonViewSet, FeatureUsageViewSet, SubscriptionAuditLogViewSet,
    SystemQuotaViewSet,
    ApplicationModuleViewSet, ApplicationActionViewSet, ModuleActionViewSet, ApplicationModuleAuditLogViewSet,
    # Phase 2: Member Premium
    MemberPremiumPlanViewSet, MemberPremiumFeatureViewSet, MemberPremiumBenefitViewSet,
    MemberPremiumAddonViewSet, MemberPremiumCouponViewSet, MemberPremiumSubscriptionViewSet,
    MemberFeatureUsageViewSet, MemberPremiumTransactionViewSet, MemberPremiumInvoiceViewSet,
    MemberAddonPurchaseViewSet, MemberPremiumAuditLogViewSet,
    MemberPremiumRewardViewSet, MemberPremiumSupportTicketViewSet, PremiumFeatureRegistryViewSet,
    # Phase 3.3: Community Subscriptions
    CommunityLicenseViewSet, CommunityModuleAccessViewSet, CommunityUsageViewSet,
    CommunityBillingViewSet, CommunityInvoiceViewSet, CommunityTransactionViewSet,
    CommunityAddonViewSet, CommunityAuditLogViewSet,
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'communities', CommunityViewSet, basename='community')
router.register(r'members', MemberViewSet, basename='member')
router.register(r'committee', CommitteeViewSet, basename='committee')
router.register(r'events', EventViewSet, basename='event')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'job-applications', JobApplicationViewSet, basename='job-application')
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'matrimony', MatrimonyProfileViewSet, basename='matrimony')
router.register(r'matrimony-profiles', MatrimonyProfileViewSet, basename='matrimony-profile')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'donations', DonationViewSet, basename='donation')
router.register(r'news', NewsViewSet, basename='news')
router.register(r'families', FamilyViewSet, basename='family')
router.register(r'family-members', FamilyMemberViewSet, basename='family-member')
router.register(r'event-registrations', EventRegistrationViewSet, basename='event-registration')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'approval-history', CommunityApprovalHistoryViewSet, basename='approval-history')
router.register(r'plans', SubscriptionPlanViewSet, basename='plan')
router.register(r'features', FeatureMasterViewSet, basename='feature')
router.register(r'plan-permissions', PlanFeaturePermissionViewSet, basename='plan-permission')
router.register(r'community-subscriptions', CommunitySubscriptionViewSet, basename='community-subscription')
router.register(r'subscription-history', SubscriptionHistoryViewSet, basename='subscription-history')
router.register(r'plan-addons', PlanAddonViewSet, basename='plan-addon')
router.register(r'system-quotas', SystemQuotaViewSet, basename='system-quota')
router.register(r'feature-usages', FeatureUsageViewSet, basename='feature-usage')
router.register(r'subscription-audit-logs', SubscriptionAuditLogViewSet, basename='subscription-audit-log')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'advertisements', AdvertisementViewSet, basename='advertisement')
router.register(r'gallery', GalleryViewSet, basename='gallery')
router.register(r'message-requests', MessageRequestViewSet, basename='message-request')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'booking-properties', BookingPropertyViewSet, basename='booking-property')
router.register(r'property-resources', PropertyResourceViewSet, basename='property-resource')
router.register(r'resource-pricing', ResourcePricingViewSet, basename='resource-pricing')
router.register(r'venue-bookings', VenueBookingViewSet, basename='venue-booking')
router.register(r'booking-inspections', BookingInspectionViewSet, basename='booking-inspection')
router.register(r'booking-refunds', BookingRefundViewSet, basename='booking-refund')
router.register(r'booking-waiting-list', BookingWaitingListViewSet, basename='booking-waiting-list')
router.register(r'resource-locks', ResourceLockViewSet, basename='resource-lock')
router.register(r'resource-dependencies', ResourceDependencyViewSet, basename='resource-dependency')
router.register(r'modules', ApplicationModuleViewSet, basename='module')
router.register(r'actions', ApplicationActionViewSet, basename='action')
router.register(r'module-actions', ModuleActionViewSet, basename='module-action')
router.register(r'module-audit-logs', ApplicationModuleAuditLogViewSet, basename='module-audit-log')
# Phase 2: Member Premium
router.register(r'member-premium-plans', MemberPremiumPlanViewSet, basename='member-premium-plan')
router.register(r'member-premium-features', MemberPremiumFeatureViewSet, basename='member-premium-feature')
router.register(r'member-premium-benefits', MemberPremiumBenefitViewSet, basename='member-premium-benefit')
router.register(r'member-premium-addons', MemberPremiumAddonViewSet, basename='member-premium-addon')
router.register(r'member-premium-coupons', MemberPremiumCouponViewSet, basename='member-premium-coupon')
router.register(r'member-premium-subscriptions', MemberPremiumSubscriptionViewSet, basename='member-premium-subscription')
router.register(r'member-feature-usages', MemberFeatureUsageViewSet, basename='member-feature-usage')
router.register(r'member-premium-transactions', MemberPremiumTransactionViewSet, basename='member-premium-transaction')
router.register(r'member-premium-invoices', MemberPremiumInvoiceViewSet, basename='member-premium-invoice')
router.register(r'member-addon-purchases', MemberAddonPurchaseViewSet, basename='member-addon-purchase')
router.register(r'member-premium-audit-logs', MemberPremiumAuditLogViewSet, basename='member-premium-audit-log')
router.register(r'member-premium-rewards', MemberPremiumRewardViewSet, basename='member-premium-reward')
router.register(r'member-premium-tickets', MemberPremiumSupportTicketViewSet, basename='member-premium-ticket')
router.register(r'premium-feature-registry', PremiumFeatureRegistryViewSet, basename='premium-feature-registry')


# Phase 3.3: Community Subscriptions
router.register(r'community-licenses', CommunityLicenseViewSet, basename='community-license')
router.register(r'community-module-accesses', CommunityModuleAccessViewSet, basename='community-module-access')
router.register(r'community-usages', CommunityUsageViewSet, basename='community-usage')
router.register(r'community-billings', CommunityBillingViewSet, basename='community-billing')
router.register(r'community-invoices', CommunityInvoiceViewSet, basename='community-invoice')
router.register(r'community-transactions', CommunityTransactionViewSet, basename='community-transaction')
router.register(r'community-addons', CommunityAddonViewSet, basename='community-addon')
router.register(r'community-audit-logs', CommunityAuditLogViewSet, basename='community-audit-log')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/me/', MeView.as_view(), name='auth_me'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/verify-forgot-otp/', VerifyForgotOTPView.as_view(), name='verify_forgot_otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('auth/register-send-otp/', RegisterSendOTPView.as_view(), name='register_send_otp'),
    path('auth/register-verify-otp/', RegisterVerifyOTPView.as_view(), name='register_verify_otp'),
]
