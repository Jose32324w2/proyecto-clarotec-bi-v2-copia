# backend/usuarios/migrations/0002_precargar_roles.py

from django.db import migrations

def precargar_roles(apps, schema_editor):
    Roles = apps.get_model('usuarios', 'Roles')
    roles_a_crear = ['Administrativa', 'Vendedor', 'Despachador', 'Gerencia']
    for rol_nombre in roles_a_crear:
        Roles.objects.create(nombre=rol_nombre)

class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(precargar_roles),
    ]
