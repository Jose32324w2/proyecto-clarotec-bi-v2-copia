import os  # Importa la clase os para manejar rutas de archivos
from django.core.management.base import BaseCommand  # Importa la clase BaseCommand para crear comandos
from django.core.management import call_command  # Importa la clase call_command para ejecutar comandos
from django.conf import settings  # Importa la clase settings para obtener configuraciones


class Command(BaseCommand):
    help = 'Generates a full database backup safely handling encoding (UTF-8)'

# Método principal que se ejecuta cuando se llama al comando
    def handle(self, *args, **options):

        # Define output path
        # settings.BASE_DIR es la ruta base del proyecto (donde está el archivo manage.py)
        output_file = os.path.join(settings.BASE_DIR, 'gestion', 'data',
                                   'backup_final_aws.json')  # Define la ruta del archivo de salida

        # Asegura que el directorio existe
        os.makedirs(os.path.dirname(output_file), exist_ok=True)  # Asegura que el directorio existe

        self.stdout.write(f"⏳ Starting backup to: {output_file}")  # Muestra un mensaje de inicio

        try:
            # Abre el archivo con codificación UTF-8
            with open(output_file, 'w', encoding='utf-8') as f:
                # Llama al comando dumpdata para hacer el backup
                call_command(
                    'dumpdata',  # Comando para hacer el backup
                    exclude=['auth.permission', 'contenttypes', 'sessions.session',
                             'admin.logentry'],  # Excluye ciertos modelos
                    indent=2,  # Indentación del archivo
                    stdout=f  # Salida del comando
                )

            # Muestra un mensaje de éxito
            self.stdout.write(self.style.SUCCESS(f"✅ Backup successfully created at: {output_file}"))
            # Muestra el tamaño del archivo
            self.stdout.write(self.style.SUCCESS(f"file size: {os.path.getsize(output_file) / 1024:.2f} KB"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Backup failed: {str(e)}"))  # Muestra un mensaje de error
