from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import RegisterSerializer, UserSerializer, LLMSettingsSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['name'] = user.name
        token['role'] = user.role
        if user.organization:
            token['organization_id'] = str(user.organization.id)
            token['organization_name'] = user.organization.name
        return token

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = UserSerializer(request.user if not request.user.is_anonymous else None).data
            # Note: request.user is not populated yet in TokenObtainPairView.post
            # We need to get the user manually from the email in the request if we want to include user data
            from .models import User
            try:
                user_obj = User.objects.get(email=request.data['email'])
                response.data['user'] = UserSerializer(user_obj).data
            except Exception:
                pass
        return response

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class LLMSettingsView(generics.GenericAPIView):
    permission_classes = (IsAdmin,)
    serializer_class = LLMSettingsSerializer

    def get(self, request):
        organization = request.user.organization
        if not organization:
            return Response({"error": "User has no organization"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(organization.llm_config)

    def patch(self, request):
        organization = request.user.organization
        if not organization:
            return Response({"error": "User has no organization"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Merge new settings with existing ones
        current_config = organization.llm_config or {}
        current_config.update(serializer.validated_data)
        
        organization.llm_config = current_config
        organization.save()
        
        return Response(organization.llm_config)

class RegisterView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User registered successfully",
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        # For JWT, logout is typically handled client-side by deleting the token
        # But we can add token blacklisting if needed in the future
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
