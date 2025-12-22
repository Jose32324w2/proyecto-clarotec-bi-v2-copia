from pathlib import Path # Importa la clase Path
from .settings import *  # Importa todas las configuraciones de settings


# Verifica si BASE_DIR está definido en el entorno local
if 'BASE_DIR' not in locals():
    BASE_DIR = Path(__file__).resolve().parent.parent

# Configuración de la base de datos
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
