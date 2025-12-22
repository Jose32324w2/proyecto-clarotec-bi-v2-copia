# Generated manually to add opciones_envio

from django.db import migrations, models # Importamos el módulo de migraciones y modelos

class Migration(migrations.Migration): # Clase Migration que define la migración
    # Dependencias de la migración
    dependencies = [
        ('gestion', '0006_auto_add_shipping_fields'),
    ]

    # Operaciones de la migración
    operations = [
        migrations.AddField(
            model_name='pedido',
            name='opciones_envio',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]
