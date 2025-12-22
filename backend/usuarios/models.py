"""
Modelos de Usuario y Autenticación.

PROPOSITO:
    Extiende el modelo de usuario por defecto de Django (AbstractUser).
    Gestiona la identidad, roles y permisos dentro del sistema.

MODELOS:
    - User: Usuario personalizado (login con email).
    - Roles: Definición de perfiles (Vendedor, Gerencia, Cliente).
"""
# backend/usuarios/models.py

from django.db import models # Importa models
from django.contrib.auth.models import AbstractUser, BaseUserManager # Importa AbstractUser y BaseUserManager


class Roles(models.Model):
    nombre = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nombre


class UserManager(BaseUserManager):
    """
    Manager personalizado para el modelo User donde el email es el identificador único
    en lugar del username.
    """

    def create_user(self, email, password, **extra_fields):
        """
        Crea y guarda un User con el email y password dados.
        """
        if not email:
            raise ValueError('El Email debe ser proporcionado')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hashea la contraseña
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Crea y guarda un SuperUser con el email y password dados.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

# backend/usuarios/models.py


class User(AbstractUser):
    # ... (los campos que ya tenías: username=None, email, rol) ...
    username = None
    email = models.EmailField('email address', unique=True)
    rol = models.ForeignKey(Roles, on_delete=models.SET_NULL, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()  # Le decimos a Django que use nuestro manager

    def __str__(self):
        return self.email
