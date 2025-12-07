from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from usuarios.models import Roles

class Command(BaseCommand):
    help = 'Crea usuario de prueba para Cypress'

    def handle(self, *args, **options):
        User = get_user_model()
        email = 'admin@clarotec.cl'
        password = 'admin123'
        
        # Asegurar que el rol existe
        rol, _ = Roles.objects.get_or_create(nombre='Gerencia')

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
            self.stdout.write(self.style.SUCCESS(f'Usuario {email} creado exitosamente'))
        else:
            self.stdout.write(self.style.WARNING(f'Usuario {email} ya existe'))
