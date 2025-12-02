# Generated manually to fix missing fields

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0005_cliente_telefono'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedido',
            name='region',
            field=models.CharField(blank=True, choices=[('RM', 'Región Metropolitana'), ('NORTE', 'Zona Norte'), ('CENTRO', 'Zona Centro'), ('SUR', 'Zona Sur'), ('EXTREMO', 'Zona Extrema')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='comuna',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='metodo_envio',
            field=models.CharField(blank=True, choices=[('STARKEN', 'Starken'), ('CHILEXPRESS', 'Chilexpress'), ('BLUE', 'Blue Express'), ('OTRO', 'Otro / Transporte Propio')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='nombre_transporte_custom',
            field=models.CharField(blank=True, help_text='Nombre del transporte si el método es OTRO', max_length=255, null=True),
        ),
    ]
