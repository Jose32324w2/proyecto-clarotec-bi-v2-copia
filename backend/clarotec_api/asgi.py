"""
ASGI config for clarotec_api project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os


from django.core.asgi import get_asgi_application  # Importa la función get_asgi_application

# Establece la ruta del archivo de configuración de Django como valor por defecto en las variables de entorno si no se ha definido previamente.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings')

# Obtiene la aplicación ASGI de Django.
application = get_asgi_application()
