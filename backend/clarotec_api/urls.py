# backend/clarotec_api/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from usuarios.views import MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Endpoints de autenticación de Simple JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Endpoints de la app 'usuarios'
    path('api/users/me/', MeView.as_view(), name='user_me'),

    # Endpoints de la app 'gestion'
    path('api/', include('gestion.urls')), 
]