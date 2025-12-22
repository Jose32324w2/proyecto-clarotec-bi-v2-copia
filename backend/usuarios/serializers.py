"""
Serializadores de Usuario.

PROPOSITO:
    Maneja la representación JSON de los usuarios y sus roles.
    Utilizado principalmente para devolver datos del usuario actual (MeView).
"""
# backend/usuarios/serializers.py

from rest_framework import serializers # Importa serializers
from .models import User, Roles # Importa User y Roles


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = ['nombre']


class UserSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    cliente_data = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'rol', 'cliente_data']

    def get_cliente_data(self, obj):
        # Evitar import circular
        from gestion.models import Cliente
        try:
            cliente = Cliente.objects.get(email=obj.email)
            return {
                'id': cliente.id,
                'empresa': cliente.empresa,
                'telefono': cliente.telefono
            }
        except Cliente.DoesNotExist:
            return None
