"""
Módulo de Pruebas Integrales: Gestión de Pagos.

Este módulo verifica los endpoints y la lógica de negocio relacionada con
la confirmación y validación de pagos de pedidos.
"""
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from gestion.models import Cliente, Pedido
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestPagos:
    def setup_method(self):
        """
        Configura el entorno de pruebas antes de cada método.
        """
        # Inicializa cliente HTTP.
        self.client = APIClient()

        # Obtiene rol Gerencia.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea usuario "admin" autorizado para aprobar pagos.
        self.admin = User.objects.create_user(email='admin@clarotec.cl', password='password123', rol=role)

        # Autentica la sesión como admin.
        self.client.force_authenticate(user=self.admin)

        # Crea un cliente propietario del pedido.
        self.cliente = Cliente.objects.create(nombre="Pay Test", email="pay@test.com")

        # Crea un pedido base en estado 'aceptado'.
        # Es necesario que esté 'aceptado' para que el sistema permita pagar.
        self.pedido = Pedido.objects.create(
            cliente=self.cliente,
            estado='aceptado',
            porcentaje_urgencia=Decimal('0.00'),
            costo_envio_estimado=Decimal('5000')
        )

        # Agrega un ítem para que el pedido tenga un monto válido (> 0).
        from gestion.models import ItemsPedido
        ItemsPedido.objects.create(
            pedido=self.pedido,
            descripcion="Item prueba",
            cantidad=1,
            precio_unitario=Decimal('45000'))

    def test_confirmar_pago_exitoso(self):
        """
        Prueba el flujo exitoso de confirmación de pago.
        """
        # Obtiene URL del endpoint 'confirmar-pago' para el pedido creado.
        url = reverse('confirmar-pago', args=[self.pedido.id])

        # Envía petición POST.
        response = self.client.post(url)

        # Verifica respuesta 200 OK.
        assert response.status_code == status.HTTP_200_OK

        # Actualiza la instancia del pedido desde la BD.
        self.pedido.refresh_from_db()

        # Verifica que el estado sea ahora 'pago_confirmado'.
        assert self.pedido.estado == 'pago_confirmado'

    def test_confirmar_pago_estado_invalido(self):
        """
        Prueba la validación de estado previo al pago.
        """
        # Modifica el estado a 'solicitud' (que NO es válido para pagar).
        self.pedido.estado = 'solicitud'

        # Guarda el cambio.
        self.pedido.save()

        # Obtiene URL.
        url = reverse('confirmar-pago', args=[self.pedido.id])

        # Envía petición POST intentando pagar.
        response = self.client.post(url)

        # Verifica que el servidor rechace la petición con 400 Bad Request.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Recarga desde BD.
        self.pedido.refresh_from_db()

        # Verifica que el estado NO haya cambiado.
        assert self.pedido.estado == 'solicitud'
