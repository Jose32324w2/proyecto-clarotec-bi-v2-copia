"""
Módulo de Pruebas: Estrategias de Retención de Clientes.

Valida los mecanismos automatizados y manuales para la fidelización
y recuperación de clientes, incluyendo notificaciones por inactividad.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
from django.core import mail
from datetime import timedelta
from gestion.models import Pedido, Cliente
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestRetention:
    def setup_method(self):
        """
        Configuración de Entorno.
        """
        # Inicializa cliente.
        self.client = APIClient()

        # Configura usuario y rol.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')
        self.user = User.objects.create_user(email='retention@test.com', password='123', rol=role)

        # Autentica.
        self.client.force_authenticate(user=self.user)

        # Crea cliente "perdido" base.
        self.cliente = Cliente.objects.create(nombre="Lost Client", email="lost@test.com")

    def test_email_retencion_lost(self):
        """
        Verifica el envío de correo de recuperación para clientes perdidos.
        """
        # Crea un pedido antiguo simulando una inactividad de 100 días.
        Pedido.objects.create(
            cliente=self.cliente,
            estado='completado',
            fecha_solicitud=timezone.now() - timedelta(days=100)
        )

        # Obtiene URL de endpoint de retención.
        url = reverse('bi-retention-email', args=[self.cliente.id])

        # Dispara acción POST.
        response = self.client.post(url)

        # Valida éxito.
        assert response.status_code == status.HTTP_200_OK

        # Verifica encolado de correo.
        assert len(mail.outbox) == 1

        # Verifica asunto (subject) para confirmar que se usó la plantilla 'Lost'.
        assert "extrañamos" in mail.outbox[0].subject

    def test_update_client_status(self):
        """
        Verifica la actualización manual del estado de fidelización de un cliente.
        """
        # URL de actualización de estado.
        url = reverse('bi-retention-status', args=[self.cliente.id])

        # Envía POST cambiando el estado a 'rejected' (ej: cliente pidió baja).
        response = self.client.post(url, {'status': 'rejected'})

        # Valida éxito.
        assert response.status_code == status.HTTP_200_OK

        # Recarga.
        self.cliente.refresh_from_db()

        # Valida cambio en modelo.
        assert self.cliente.retention_status == 'rejected'

    def test_rechazar_pago(self):
        """
        Verifica el flujo de rechazo administrativo de un pago.
        """
        # Crea pedido en estado 'aceptado'.
        pedido = Pedido.objects.create(cliente=self.cliente, estado='aceptado')

        # URL de rechazo.
        url = reverse('rechazar-pago', args=[pedido.id])

        # Envía POST.
        response = self.client.post(url)

        # Valida éxito.
        assert response.status_code == status.HTTP_200_OK

        # Recarga pedido.
        pedido.refresh_from_db()

        # Valida cambio de estado a 'rechazado'.
        assert pedido.estado == 'rechazado'

        # Valida envío de correo de notificación al cliente.
        assert len(mail.outbox) == 1
