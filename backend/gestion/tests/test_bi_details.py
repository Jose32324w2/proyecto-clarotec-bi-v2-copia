"""
Módulo de Pruebas BI: Filtros Avanzados y Agregaciones.

Verifica la lógica compleja de filtrado y cálculo de rentabilidad,
incluyendo filtros cruzados, multi-selección y segmentación de clientes.
"""
# Importaciones de librerias
import pytest # Importa el framework de pruebas
from rest_framework.test import APIClient # Importa el cliente de pruebas de Django Rest Framework
from rest_framework import status # Importa los códigos de estado HTTP
from django.urls import reverse # Importa la función para resolver URLs
from django.utils import timezone # Importa la utilidad de fecha y hora
from decimal import Decimal # Importa el tipo Decimal para cálculos precisos
from datetime import timedelta # Importa la utilidad de tiempo para manejar fechas
from gestion.models import Pedido, Cliente, ItemsPedido # Importa los modelos de Pedido, Cliente y ItemsPedido
from usuarios.models import User, Roles # Importa los modelos de User y Roles

# Clase de pruebas para los detalles del BI
@pytest.mark.django_db # Marca la clase para que se ejecute con la base de datos de pruebas
class TestBIDetails:
    # Método de inicialización de datos de prueba
    def setup_method(self):
        """
        Inicialización de Datos de Prueba (Seed Data).
        """
        # Inicializa una instancia del cliente de pruebas para simular peticiones HTTP.
        self.client = APIClient()

        # Obtiene o crea el rol de 'Gerencia'.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea un usuario de prueba para BI, asignándole rol y contraseña.
        self.user = User.objects.create_user(email='bi_deep@test.com', password='123', rol=role)

        # Autentica al cliente con el usuario creado.
        self.client.force_authenticate(user=self.user)

        # Crea un cliente que representará a un cliente "Antiguo".
        self.cliente_antiguo = Cliente.objects.create(nombre="Old Client", email="old@test.com")

        # Crea otro cliente que representará a un cliente "Nuevo".
        self.cliente_nuevo = Cliente.objects.create(nombre="New Client", email="new@test.com")

        # --- PEDIDO 1 (HACE 60 DÍAS) ---
        # Crea un pedido completado con fecha de despacho hace 60 días para el cliente antiguo.
        p1 = Pedido.objects.create(
            cliente=self.cliente_antiguo,
            estado='completado',
            fecha_despacho=timezone.now() - timedelta(days=60),  # Resta 60 días a la fecha actual.
            region='Metropolitana',
            porcentaje_urgencia=Decimal('10.00'),
            costo_envio_estimado=Decimal('5000')
        )
        # Crea un ítem asociado a este pedido con precio unitario 10.000 y compra 5.000.
        ItemsPedido.objects.create(pedido=p1, descripcion="I1", cantidad=1, precio_unitario=10000, precio_compra=5000)

        # --- PEDIDO 2 (HACE 59 DÍAS) ---
        # Crea un segundo pedido antiguo para el MISMO cliente antiguo.
        # Esto es crucial: al tener 2 pedidos, el sistema lo considerará "Recurrente".
        p2 = Pedido.objects.create(
            cliente=self.cliente_antiguo,
            estado='completado',
            fecha_despacho=timezone.now() - timedelta(days=59),
            region='Metropolitana',
            porcentaje_urgencia=Decimal('0.00'),
            costo_envio_estimado=Decimal('5000')
        )
        ItemsPedido.objects.create(pedido=p2, descripcion="I2", cantidad=1, precio_unitario=10000, precio_compra=5000)

        # --- PEDIDO 3 (HOY) ---
        # Crea un pedido reciente (fecha actual) para el cliente NUEVO.
        # Región Valparaíso para probar filtros geográficos.
        p3 = Pedido.objects.create(
            cliente=self.cliente_nuevo,
            estado='completado',
            fecha_despacho=timezone.now(),
            region='Valparaiso',
            porcentaje_urgencia=Decimal('0.00'),
            costo_envio_estimado=Decimal('5000')
        )
        # Ítem de alto valor: Venta 50.000, Costo 40.000 (Ganancia esperada: 10.000).
        ItemsPedido.objects.create(pedido=p3, descripcion="I3", cantidad=1, precio_unitario=50000, precio_compra=40000)

    def test_rentabilidad_filtros_basicos(self):
        """
        Prueba de Filtro por Región.
        """
        # Obtiene la URL del reporte de rentabilidad.
        url = reverse('bi-rentabilidad')

        # Realiza GET pasando el parámetro 'region[]' con valor 'Valparaiso'.
        # Esto simula seleccionar "Valparaíso" en un dropdown del frontend.
        response = self.client.get(url, {'region[]': ['Valparaiso']})

        # Verifica conexión exitosa (200 OK).
        assert response.status_code == status.HTTP_200_OK

        # Verifica que la lista resultante tenga solo 1 elemento (el pedido de Valparaíso).
        assert len(response.data) == 1

        # Verifica que el cliente en ese resultado sea "New Client".
        assert response.data[0]['cliente'] == "New Client"

        # Validación Matemática:
        # Extrae el primer objeto de la lista.
        item = response.data[0]
        # Verifica que la ganancia calculada sea 10.000 (50.000 - 40.000).
        # Se compara como flotante porque JSON serializa Decimales a float/string.
        assert item['ganancia'] == 10000.0

    def test_rentabilidad_tipo_cliente(self):
        """
        Prueba de Segmentación de Clientes (Nuevos vs Recurrentes).
        """
        url = reverse('bi-rentabilidad')

        # Filtra enviando 'client_type[]'='new'.
        # El sistema debe buscar clientes con exactamente 1 pedido histórico completado (o lógica de 1era compra).
        response = self.client.get(url, {'client_type[]': ['new']})

        # Verifica que solo aparece 1 registro.
        assert len(response.data) == 1

        # Verifica que es el "New Client", ignorando al "Old Client" que tiene 2 pedidos.
        assert response.data[0]['cliente'] == "New Client"

    def test_filter_options_logic(self):
        """
        Prueba de Lógica de Facetas (Opciones de Filtro).
        """
        url = reverse('bi-filter-options')

        # Solicita las opciones de filtro disponibles, simulando que el usuario ya seleccionó 'Valparaiso'.
        # La lógica de facetas debería seguir mostrando OTRAS regiones disponibles para permitir cambio de selección.
        response = self.client.get(url, {'region': 'Valparaiso'})

        # Verifica que la respuesta incluya la llave 'regions'.
        assert 'regions' in response.data
