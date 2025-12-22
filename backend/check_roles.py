# backend/check_roles.py
import os # Importa os
import django # Importa django
import sys # Importa sys
from usuarios.models import Roles # Importa Roles

sys.path.append(os.getcwd()) # Agrega el directorio actual al PATH
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings') # Configura la configuración de Django

django.setup() # Inicializa Django


print("--- ROLES EXISTENTES ---")
for r in Roles.objects.all(): # Recorre todos los roles
    print(f"- {r.nombre}") # Imprime el nombre de cada rol
