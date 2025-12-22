from django.core.management.base import BaseCommand 
from gestion.models import Cliente # Cliente

# Comando para migrar nombres de clientes
class Command(BaseCommand):
    help = 'Divide el campo nombre en nombres y apellidos para clientes existentes.'
    # Maneja la lógica del comando
    def handle(self, *args, **kwargs):
        clientes = Cliente.objects.all()
        count = 0
        # Muestra un mensaje de inicio
        self.stdout.write("Iniciando migración de nombres...")
        # Recorre todos los clientes
        for cliente in clientes:
            full_name = cliente.nombre.strip()
            if not full_name:
                continue

            # Lógica simple de partición: Tomar la primera palabra como nombre, resto como apellido
            parts = full_name.split(' ', 1)

            if len(parts) == 2:
                cliente.nombres = parts[0]
                cliente.apellidos = parts[1]
            else:
                # Caso nombre único (ej. "Google")
                cliente.nombres = parts[0]
                cliente.apellidos = ""  # No hay apellido

            cliente.save()
            count += 1
            self.stdout.write(f"Migrado: {full_name} -> [{cliente.nombres}] [{cliente.apellidos}]")

        self.stdout.write(self.style.SUCCESS(f'Exitosamente migrados {count} clientes.'))
