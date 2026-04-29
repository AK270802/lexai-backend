from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import MyTokenObtainPairView, RegisterView, UserProfileView, LLMSettingsView, LogoutView

urlpatterns = [
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', UserProfileView.as_view(), name='user_me'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('org/settings/llm/', LLMSettingsView.as_view(), name='org_llm_settings'),
]
