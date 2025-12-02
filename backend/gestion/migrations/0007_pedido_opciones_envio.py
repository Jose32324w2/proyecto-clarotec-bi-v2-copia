# Generated manually to add opciones_envio

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0006_auto_add_shipping_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedido',
            name='opciones_envio',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]
