"""
Vistas de Gestión de Usuario.

PROPOSITO:
    Endpoints relacionados con la cuenta del usuario.
    
VISTAS:
    - MeView: Devuelve el perfil del usuario autenticado (frontend 'whoami').
"""
# backend/usuarios/views.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer


class MeView(APIView):
    # Esta línea asegura que solo usuarios con un token válido puedan acceder.
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Devuelve la información del usuario que está haciendo la petición.
        'request.user' es poblado automáticamente por DRF después de validar el token.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
