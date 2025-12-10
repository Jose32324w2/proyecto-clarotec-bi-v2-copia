"""
Módulo de Pruebas: Vistas del Panel Administrativo.

Este módulo asegura que las vistas de listado y herramientas operativas
del panel de administración respondan correctamente y carguen los datos esperados.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from gestion.models import Pedido, Cliente
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestAdminViews:
    def setup_method(self):
        """
        Configuración del entorno: Autenticación de usuario administrativo 'Gerencia'.
        """
        # Inicializa una instancia del cliente de pruebas de Django Rest Framework.
        # Este objeto simula un navegador web o una herramienta como Postman.
        self.client = APIClient()

        # Busca en la base de datos el objeto Rol con nombre 'Gerencia'.
        # Si no existe, lo crea automáticamente. 'role' es el objeto, '_' ignora el booleano 'created'.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea un nuevo usuario en la base de datos de pruebas.
        # Se le asigna el email, contraseña y el rol de Gerencia obtenido arriba.
        self.user = User.objects.create_user(email='admin@views.com', password='123', rol=role)

        # Ordena al cliente de pruebas que se autentique automáticamente con este usuario.
        # Todas las peticiones subsiguientes se harán "como si" este usuario estuviera logueado.
        self.client.force_authenticate(user=self.user)

        # Crea un Cliente de prueba en la base de datos para usarlo en los pedidos.
        self.cliente = Cliente.objects.create(nombre="View Client", email="view@test.com")

    def test_listas_administrativas(self):
        """
        Prueba de Carga de Listados Administrativos.
        """
        # Crea un pedido en estado 'solicitud' asociado al cliente de prueba.
        Pedido.objects.create(cliente=self.cliente, estado='solicitud')
        # Crea un pedido en estado 'cotizado'.
        Pedido.objects.create(cliente=self.cliente, estado='cotizado')
        # Crea un pedido en estado 'aceptado'.
        Pedido.objects.create(cliente=self.cliente, estado='aceptado')
        # Crea un pedido en estado 'pago_confirmado'.
        Pedido.objects.create(cliente=self.cliente, estado='pago_confirmado')
        # Crea un pedido en estado 'despachado'.
        Pedido.objects.create(cliente=self.cliente, estado='despachado')

        # Define una lista (array) con los nombres de las rutas (URL names) que queremos probar.
        # Cada string corresponde al 'name=' definido en urls.py.
        endpoints = [
            'panel-solicitudes-list',
            'panel-pedidos-cotizados',
            'panel-pedidos-aceptados',
            'panel-pedidos-historial-pagos',
            'panel-pedidos-despachar',
            'panel-pedidos-historial-despachos',
            'panel-pedidos-historial-cotizaciones'
        ]

        # Inicia un bucle para recorrer cada nombre de endpoint en la lista.
        for endpoint in endpoints:
            # Convierte el nombre del endpoint (ej: 'panel-solicitudes-list') en su
            # URL real (ej: '/api/pedidos/solicitudes/').
            url = reverse(endpoint)

            # Realiza una petición HTTP GET a la URL resuelta.
            response = self.client.get(url)

            # Verifica que el servidor responda con código 200 (OK).
            # Si falla, muestra un mensaje personalizado con el nombre del endpoint fallido.
            assert response.status_code == status.HTTP_200_OK, f"Fallo en endpoint: {endpoint}"

            # Verifica que la respuesta (response.data) sea una lista JSON.
            # O, en caso de usar paginación, que contenga la clave 'results'.
            assert isinstance(response.data, list) or 'results' in response.data

    def test_marcar_como_despachado(self):
        """
        Pruebas de la acción operativa: Marcar como Despachado.
        """
        # Crea un pedido específico en estado 'pago_confirmado', listo para ser despachado.
        pedido = Pedido.objects.create(cliente=self.cliente, estado='pago_confirmado')

        # Obtiene la URL para la acción de marcar despachado, pasando el ID del pedido.
        url = reverse('marcar-despachado', args=[pedido.id])

        # Define un diccionario con los datos que se enviarán en el cuerpo (body) de la petición POST.
        # Simula lo que el frontend enviaría al completar el formulario de despacho.
        data = {
            'transportista': 'Starken',
            'numero_guia': '123456789'
        }

        # Realiza la petición HTTP POST a la URL, enviando los datos definidos.
        response = self.client.post(url, data)

        # Verifica que la operación haya sido exitosa (Código 200).
        assert response.status_code == status.HTTP_200_OK

        # Actualiza el objeto 'pedido' desde la base de datos para obtener los cambios más recientes.
        pedido.refresh_from_db()

        # Verifica que el estado del pedido haya cambiado correctamente a 'despachado'.
        assert pedido.estado == 'despachado'

        # Verifica que el campo transportista se haya guardado correctamente.
        assert pedido.transportista == 'Starken'

    def test_calcular_envio(self):
        """
        Prueba del endpoint de utilidad para cálculo de costos de envío.
        """
        # Obtiene la URL del endpoint de cálculo de envíos.
        url = reverse('calcular-envio')

        # Define los datos de entrada: una comuna de ejemplo.
        data = {'comuna': 'Santiago'}

        # Realiza la petición POST enviando la comuna.
        response = self.client.post(url, data)

        # Verifica que el servidor procese el cálculo correctamente (200 OK).
        assert response.status_code == status.HTTP_200_OK

        # Verifica que la respuesta JSON contenga la clave 'opciones' (ej: tarifas de Starken/Chilexpress).
        assert 'opciones' in response.data
