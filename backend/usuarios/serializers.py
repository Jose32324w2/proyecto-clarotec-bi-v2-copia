# backend/usuarios/serializers.py

from rest_framework import serializers
from .models import User, Roles

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = ['nombre']

class UserSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'rol']