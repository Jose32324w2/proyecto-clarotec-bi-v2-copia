"""
Módulo de Pruebas Unitarias de Modelos.

Verifica la integridad referencial, valores por defecto y lógica encapsulada
en los modelos de la base de datos, asegurando la consistencia del esquema.
"""
import pytest
from gestion.models import Cliente
from django.utils import timezone


@pytest.mark.django_db
def test_cliente_creation():
    """
    Verifica la instanciación de un Cliente.
    """
    # Crea e inserta un nuevo registro en la tabla Cliente.
    cliente = Cliente.objects.create(
        nombre="Test",
        apellido="Client",
        email="test@example.com",
        empresa="Test Corp"
    )

    # Verifica que el atributo 'nombre' se haya guardado correctamente.
    assert cliente.nombre == "Test"
    assert cliente.apellido == "Client"

    # Verifica que el atributo 'email' se haya guardado correctamente.
    assert cliente.email == "test@example.com"

    # Verifica que 'retention_status' tenga el valor por defecto 'pending'.
    assert cliente.retention_status == "pending"

    # Verifica que la fecha de envío de email sea nula (None) al inicio.
    assert cliente.last_retention_email_sent_at is None


@pytest.mark.django_db
def test_cliente_retention_update():
    """
    Verifica la actualización de estados de retención.
    """
    # Crea un registro inicial de Cliente.
    cliente = Cliente.objects.create(
        nombre="Test",
        apellido="Client 2",
        email="test2@example.com"
    )

    # Simula la lógica de negocio: Cambia el estado en memoria a 'contacted'.
    cliente.retention_status = "contacted"

    # Asigna la fecha y hora actual (timezone aware) al campo de envío.
    cliente.last_retention_email_sent_at = timezone.now()

    # Ejecuta UPDATE en la base de datos para persistir los cambios.
    cliente.save()

    # Verifica que el estado en el objeto coincida con el valor asignado.
    assert cliente.retention_status == "contacted"

    # Verifica que el campo de fecha ya no sea nulo.
    assert cliente.last_retention_email_sent_at is not None
