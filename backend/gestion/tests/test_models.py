"""
Pruebas Unitarias de Modelos (Backend).

PROPOSITO:
    Verificar la integridad de los datos y la lógica de negocio encapsulateda en los modelos.
    Asegura que campos nuevos (retention_status) funcionen como se espera.
"""
import pytest
from gestion.models import Cliente
from django.utils import timezone


@pytest.mark.django_db
def test_cliente_creation():
    cliente = Cliente.objects.create(
        nombre="Test Client",
        email="test@example.com",
        empresa="Test Corp"
    )
    assert cliente.nombre == "Test Client"
    assert cliente.email == "test@example.com"
    assert cliente.retention_status == "pending"
    assert cliente.last_retention_email_sent_at is None


@pytest.mark.django_db
def test_cliente_retention_update():
    cliente = Cliente.objects.create(
        nombre="Test Client 2",
        email="test2@example.com"
    )

    cliente.retention_status = "contacted"
    cliente.last_retention_email_sent_at = timezone.now()
    cliente.save()

    assert cliente.retention_status == "contacted"
    assert cliente.last_retention_email_sent_at is not None
