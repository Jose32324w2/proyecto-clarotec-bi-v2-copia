"""
Módulo de Pruebas de Integración: Servicios Externos y Acceso Público.

Este módulo valida la interacción del sistema con componentes externos a la base de datos,
incluyendo la generación de archivos (PDF), envío de correos electrónicos y
la creación de solicitudes por usuarios no autenticados (público).
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.core import mail
from gestion.models import Cliente, Pedido, ItemsPedido
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestIntegrations:
    def setup_method(self):
        """
        Configuración predeterminada para pruebas autenticadas.
        """
        # Inicializa cliente HTTP para simular peticiones.
        self.client = APIClient()

        # Obtiene o crea el rol 'Gerencia'.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea un usuario administrativo para ejecutar acciones protegidas.
        self.user = User.objects.create_user(email='admin@int.com', password='123', rol=role)

    def test_crear_solicitud_publica(self):
        """
        Verifica la creación de solicitudes por usuarios anónimos.
        """
        # Cierra sesión explícitamente para asegurar que la petición sea anónima.
        self.client.logout()

        # Obtiene la URL del endpoint público de creación de solicitudes.
        url = reverse('solicitud-create')

        # Define el payload JSON con los datos del formulario de contacto público.
        data = {
            'cliente': {
                'nombre': 'Public',
                'apellido': 'User',
                'email': 'public@test.com',
                'empresa': 'Testing S.A.',
                'telefono': '+56912345678'
            },
            'items': [
                {'tipo': 'MANUAL', 'descripcion': 'Cotización Web', 'cantidad': 5}
            ],
            'region': 'RM',
            'comuna': 'Santiago'
        }

        # Envía la petición POST con los datos en formato JSON.
        response = self.client.post(url, data, format='json')

        # Verifica que el servidor responda 201 Created (Recurso Creado).
        assert response.status_code == status.HTTP_201_CREATED

        # Consulta la base de datos para confirmar que existe un Pedido asociado al email dado.
        assert Pedido.objects.filter(cliente__email='public@test.com').exists()

    def test_generar_pdf_cotizacion(self):
        """
        Verifica la generación correcta del documento PDF de cotización.
        """
        # Autentica la sesión con el usuario administrativo creado en setup.
        self.client.force_authenticate(user=self.user)

        # Crea datos mínimos en BD: Cliente.
        cliente = Cliente.objects.create(nombre="PDF", apellido="Client", email="pdf@test.com")
        # Crea Pedido.
        pedido = Pedido.objects.create(cliente=cliente, estado='cotizado')
        # Crea un Ítem para que el PDF tenga contenido.
        ItemsPedido.objects.create(pedido=pedido, descripcion="Item PDF", cantidad=1, precio_unitario=1000)

        # Obtiene la URL de generación de PDF para este pedido.
        url = reverse('generar-pdf', args=[pedido.id])

        # Ejecuta la petición GET (descarga).
        response = self.client.get(url)

        # Verifica respuesta exitosa 200 OK.
        assert response.status_code == status.HTTP_200_OK

        # Verifica que la cabecera 'Content-Type' sea 'application/pdf'.
        assert response['Content-Type'] == 'application/pdf'

        # Verifica que el cuerpo de la respuesta tenga bytes (no esté vacío).
        assert len(response.content) > 100

    def test_enviar_email_cotizacion(self):
        """
        Verifica el servicio de envío de correos electrónicos.
        """
        # Autentica usuario administrativo.
        self.client.force_authenticate(user=self.user)

        # Crea Cliente y Pedido para la prueba.
        cliente = Cliente.objects.create(nombre="Mail", apellido="Client", email="mail@test.com")
        pedido = Pedido.objects.create(cliente=cliente, estado='cotizado')

        # Obtiene URL de la acción de envío de email.
        url = reverse('enviar-cotizacion', args=[pedido.id])

        # Ejecuta la petición POST para disparar el envío.
        response = self.client.post(url)

        # Verifica respuesta exitosa.
        assert response.status_code == status.HTTP_200_OK

        # Verifica que la bandeja de salida simulada de Django (mail.outbox) tenga 1 mensaje nuevo.
        assert len(mail.outbox) == 1

        # Verifica que el campo 'To' del correo coincida con el email del cliente.
        assert mail.outbox[0].to == ['mail@test.com']
