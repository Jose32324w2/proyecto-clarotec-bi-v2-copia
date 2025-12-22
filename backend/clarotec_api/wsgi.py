"""
WSGI config for clarotec_api project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os # Importación del sistema operativo para variables de entorno
from django.core.wsgi import get_wsgi_application # Importación de get_wsgi_application

# Establece la ruta del archivo de configuración de Django como valor por defecto en las variables de entorno si no se ha definido previamente.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings')

# Obtiene la aplicación WSGI de Django.
application = get_wsgi_application() 