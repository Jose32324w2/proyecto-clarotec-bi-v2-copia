"""
Módulo de Pruebas Unitarias: Gestión de Pedidos.

Este módulo verifica la correcta funcionalidad del ciclo de vida de los pedidos
y la exactitud de los cálculos financieros asociados.
"""
import pytest # Importa el framework de pruebas
from decimal import Decimal # Importa el tipo Decimal para manejar números con precisión
from gestion.models import Cliente, Pedido, ItemsPedido # Importa los modelos de Cliente, Pedido y ItemsPedido


@pytest.mark.django_db # Marca la clase para que se ejecute con la base de datos de pruebas
class TestPedidos:

    def test_pedido_state_flow(self):
        """
        Verifica la transición de estados de un Pedido.
        """
        # Crea un cliente de prueba en la base de datos.
        cliente = Cliente.objects.create(nombre="Flow Test", email="flow@test.com")

        # Crea un pedido nuevo asociado al cliente.
        pedido = Pedido.objects.create(cliente=cliente)

        # Verifica que al crearse, el estado por defecto sea 'solicitud'.
        assert pedido.estado == 'solicitud'

        # Asigna el valor 'cotizado' al atributo estado (Simula acción del vendedor).
        pedido.estado = 'cotizado'

        # Ejecuta el método save() para persistir el cambio en la base de datos.
        pedido.save()

        # Verifica que el objeto mantenga el estado 'cotizado'.
        assert pedido.estado == 'cotizado'

        # Asigna el valor 'aceptado' (Simula acción del cliente).
        pedido.estado = 'aceptado'

        # Guarda el cambio.
        pedido.save()

        # Verifica que el estado final sea 'aceptado'.
        assert pedido.estado == 'aceptado'

    def test_financial_calculations(self):
        """
        Verifica la exactitud de los cálculos financieros del pedido.
        """
        # Crea cliente.
        cliente = Cliente.objects.create(nombre="Finance Test", email="finance@test.com")

        # Crea un pedido configurando parámetros financieros:
        # Porcentaje de urgencia: 10%
        # Costo de envío estimado: $5000
        pedido = Pedido.objects.create(
            cliente=cliente,
            porcentaje_urgencia=Decimal('10.00'),
            costo_envio_estimado=Decimal('5000')
        )

        # Crea un Ítem 1 asociado al pedido:
        # Cantidad: 2, Precio Unitario: 10.000 (Total Ítem: 20.000).
        ItemsPedido.objects.create(pedido=pedido, descripcion="Item 1", cantidad=2, precio_unitario=Decimal('10000'))

        # Crea un Ítem 2 asociado al pedido:
        # Cantidad: 1, Precio Unitario: 5.000 (Total Ítem: 5.000).
        ItemsPedido.objects.create(pedido=pedido, descripcion="Item 2", cantidad=1, precio_unitario=Decimal('5000'))

        # Lógica de Validación Matemática:
        # 1. Subtotal Ítems: 20.000 + 5.000 = 25.000
        # 2. Recargo Urgencia: 10% de 25.000 = 2.500
        # 3. Neto Acumulado: 25.000 + 2.500 = 27.500
        # 4. Impuesto IVA (19%): 0.19 * 27.500 = 5.225
        # 5. Total Bruto previo envío: 27.500 + 5.225 = 32.725
        # 6. Total Final (+ Envío 5.000): 32.725 + 5.000 = 37.725

        # Accede a la propiedad calculada 'total_cotizacion' del modelo Pedido.
        # Verifica que coincida exactamente con el valor calculado '37725'.
        assert pedido.total_cotizacion == Decimal('37725')

        # Verifica que el tipo de dato retornado sea Decimal (importante para precisión financiera).
        assert isinstance(pedido.total_cotizacion, Decimal)
