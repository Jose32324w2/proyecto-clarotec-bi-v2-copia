"""
Vistas de Gestión de Usuario.

PROPOSITO:
    Endpoints relacionados con la cuenta del usuario.

VISTAS:
    - MeView: Devuelve el perfil del usuario autenticado (frontend 'whoami').
    - ClientRegisterAPIView: Registro público de nuevos clientes.
"""
# backend/usuarios/views.py

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from .models import Roles

User = get_user_model()


class MeView(APIView):
    # Esta línea asegura que solo usuarios con un token válido puedan acceder.
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Devuelve la información del usuario que está haciendo la petición.
        'request.user' es poblado automáticamente por DRF después de validar el token.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """
        Permite actualizar los datos del usuario (Nombre, Apellido)
        y sincronizarlos con su ficha de Cliente (si existe).
        """
        user = request.user
        data = request.data

        # 1. Actualizar Usuario
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        user.save()

        # 2. Sincronizar con Cliente (si aplica)
        from gestion.models import Cliente
        try:
            cliente = Cliente.objects.get(email=user.email)
            updated = False

            if 'first_name' in data:
                cliente.nombre = data['first_name']
                updated = True

            if 'last_name' in data:
                cliente.apellido = data['last_name']
                updated = True

            if 'telefono' in data:
                cliente.telefono = data['telefono']
                updated = True

            if 'empresa' in data:
                cliente.empresa = data['empresa']
                updated = True

            if updated:
                cliente.save()

        except Cliente.DoesNotExist:
            pass  # Si no es cliente (ej. admin), solo actualiza User

        serializer = UserSerializer(user)
        return Response(serializer.data)


class ClientRegisterAPIView(APIView):
    """
    Endpoint público para registro de nuevos clientes.
    Crea un usuario y le asigna el rol 'Cliente'.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        # Validación básica
        if not email or not password or not first_name or not last_name:
            return Response({'error': 'Todos los campos son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si ya existe
        if User.objects.filter(email=email).exists():
            return Response({'error': 'El email ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscar rol 'Cliente', si no existe se debería manejar el error o crearlo (lo ideal es que exista)
            rol_cliente = Roles.objects.get(nombre='Cliente')
        except Roles.DoesNotExist:
            return Response({'error': 'Configuración de roles incompleta. Contacte al administrador.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Crear usuario
            User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                rol=rol_cliente
            )
            return Response({'status': 'Usuario creado exitosamente. Puede iniciar sesión.'},
                            status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f"Error creando usuario: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    """
    Endpoint para que un usuario autenticado cambie su contraseña.
    Requiere 'current_password' y 'new_password'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response({'error': 'Faltan campos obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar contraseña actual
        if not user.check_password(current_password):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cambiar contraseña
        try:
            # Aquí se aplicarán los validadores configurados en settings.py automáticamente
            # si usásemos un serializer, pero al hacerlo manual deberíamos validar también.
            # Por ahora confiamos en la validación simple, luego agregaremos validadores explícitos.
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, user)

            user.set_password(new_password)
            user.save()
            return Response({'status': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            # validate_password lanza ValidationError con una lista de mensajes
            return Response({'error': list(e.messages) if hasattr(e, 'messages')
                            else str(e)}, status=status.HTTP_400_BAD_REQUEST)
