from django.core.management.base import BaseCommand # Base Command 
from django.contrib.auth import get_user_model # User Model
from usuarios.models import Roles # Roles Model

# Comando para crear usuario de prueba para Cypress
class Command(BaseCommand):
    help = 'Crea usuario de prueba para Cypress' # Ayuda del comando

    def handle(self, *args, **options): # Maneja la lógica del comando
        User = get_user_model() # Obtenemos el modelo de usuario
        email = 'admin@clarotec.cl' # Email del usuario
        password = 'admin123' # Contraseña del usuario

        # Asegurar que el rol existe
        rol, _ = Roles.objects.get_or_create(nombre='Gerencia') # Obtenemos el rol o lo creamos si no existe

        # Si el usuario no existe, lo creamos
        if not User.objects.filter(email=email).exists():
            User.objects.create_user(
                email=email,
                password=password,
                first_name='Admin',
                last_name='Test',
                rol=rol,
                is_staff=True,
                is_superuser=True
            )
            # Mostramos un mensaje de éxito
            self.stdout.write(self.style.SUCCESS(f'Usuario {email} creado exitosamente'))
        else:
            # Mostramos un mensaje de advertencia
            self.stdout.write(self.style.WARNING(f'Usuario {email} ya existe'))
