import os
import django
import sys
from usuarios.models import Roles

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings')
django.setup()


print("--- ROLES EXISTENTES ---")
for r in Roles.objects.all():
    print(f"- {r.nombre}")
