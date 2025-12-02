import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings')
django.setup()

from gestion.models import ItemsPedido
from django.db import models

field = ItemsPedido._meta.get_field('referencia')
print(f"Field type: {type(field).__name__}")
print(f"Max length: {field.max_length}")
