"""
Configuración de URL principal del proyecto.

PROPOSITO:
    Punto de entrada para el enrutamiento de solicitudes HTTP.
    Delega las rutas a las aplicaciones específicas (API, Admin, Auth).

RUTAS PRINCIPALES:
    - /admin/: Panel de administración de Django.
    - /api/token/: Obtención y refresco de tokens JWT (Login).
    - /api/: Rutas principales de la aplicación 'gestion' (Endpoints de negocio).
"""
# Importaciones de Django y librerías externas 
from django.contrib import admin # Panel de administración de Django
from django.urls import path, include # Enrutamiento de URLs
from rest_framework_simplejwt.views import (
    TokenObtainPairView, # Obtención de token
    TokenRefreshView, # Refresco de token
)
from usuarios.views import MeView, ClientRegisterAPIView, ChangePasswordView # Endpoints de autenticación

urlpatterns = [
    path('admin/', admin.site.urls), # Panel de administración de Django
    # Endpoints de autenticación de Simple JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Endpoints de la app 'usuarios'
    path('api/users/me/', MeView.as_view(), name='user_me'),
    path('api/users/me/password/', ChangePasswordView.as_view(), name='change_password'),
    path('api/register/', ClientRegisterAPIView.as_view(), name='client_register'),

    # Endpoints de la app 'gestion'
    path('api/', include('gestion.urls')),
]
