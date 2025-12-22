"""
Serializadores de Datos (DRF).

PROPOSITO:
    Convierte objetos complejos (Modelos Django) a formatos nativos (JSON) y viceversa.
    Encapsula toda la validación de datos d entrada (Formularios).

SERIALIZADORES CLAVE:
    - SolicitudCreacionSerializer: Valida datos para nuevas cotizaciones.
    - PedidoSerializer: Representación completa de un pedido.
    - ClienteSerializer: Manejo de datos de clientes.
    - KPI*: Serializadores ligeros para respuestas de Business Intelligence.
"""
from rest_framework import serializers # Serializadores de datos
from .models import Cliente, Pedido, ItemsPedido, ProductoFrecuente # Modelos de datos
from django.db import transaction # Transacciones de base de datos

# 1. Serializers independientes (sin dependencias de otros serializers)

# Serializador para ProductoFrecuente   
class ProductoFrecuenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoFrecuente
        fields = '__all__'

# Serializador para ClienteInput
class ClienteInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=200)
    apellido = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    empresa = serializers.CharField(max_length=200, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=50, required=False, allow_blank=True)

# Serializador para ItemSolicitudInput
class ItemSolicitudInputSerializer(serializers.Serializer):
    tipo = serializers.CharField(max_length=20)  # LINK, MANUAL, CATALOGO
    descripcion = serializers.CharField()
    cantidad = serializers.IntegerField(min_value=1)
    referencia = serializers.CharField(required=False, allow_blank=True)
    producto_id = serializers.IntegerField(required=False, allow_null=True)

# Serializador para ClienteSerializer
class ClienteSerializer(serializers.ModelSerializer):
    es_usuario_registrado = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = '__all__'

    def get_es_usuario_registrado(self, obj):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(email=obj.email).exists()

# Serializador para ItemsPedidoSerializer
class ItemsPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemsPedido
        fields = ['id', 'descripcion', 'cantidad', 'tipo_origen', 'referencia',
                  'producto_frecuente', 'precio_unitario', 'precio_compra', 'subtotal']

# Serializador para ItemsPedidoUpdateSerializer
class ItemsPedidoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemsPedido
        fields = ['id', 'descripcion', 'cantidad', 'precio_unitario', 'precio_compra']
        # CRÍTICO: Por defecto, DRF trata 'id' como read-only.
        # Necesitamos hacerlo writable para poder recibir el ID en el payload
        extra_kwargs = {
            'id': {'read_only': False, 'required': False}
        }

# 2. Serializers que dependen de los anteriores

# Serializador para SolicitudCreacionSerializer
class SolicitudCreacionSerializer(serializers.Serializer):
    cliente = ClienteInputSerializer()
    items = serializers.ListField(child=ItemSolicitudInputSerializer())
    # Nuevos campos para envío
    region = serializers.CharField(required=False, allow_blank=True)
    comuna = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        print("--- INICIO CREATE SOLICITUD ---")
        print("Data validada:", validated_data)
        try:
            cliente_data = validated_data['cliente']
            items_data = validated_data['items']

            with transaction.atomic():
                # 1. Crear o actualizar Cliente
                print(f"Procesando cliente: {cliente_data.get('email')}")
                # Construimos el nombre legado por compatibilidad temporal (opcional)
                # full_name_legacy = f"{cliente_data['nombre']} {cliente_data['apellido']}".strip()

                cliente, created = Cliente.objects.get_or_create(
                    email=cliente_data['email'],
                    defaults={
                        'nombre': cliente_data['nombre'],
                        'apellido': cliente_data['apellido'],
                        # 'nombre': full_name_legacy,  # YA NO EXISTE EL CAMPO FISICO
                        'empresa': cliente_data.get('empresa', ''),
                        'telefono': cliente_data.get('telefono', '')
                    }
                )

                # Si el cliente ya existía, actualizamos sus datos nuevos si vienen
                if not created:
                    cliente.nombre = cliente_data['nombre']
                    cliente.apellido = cliente_data['apellido']
                    # Si empresa/telefono vienen vacíos, no los borramos, mantenemos lo que había
                    if cliente_data.get('empresa'):
                        cliente.empresa = cliente_data['empresa']
                    if cliente_data.get('telefono'):
                        cliente.telefono = cliente_data['telefono']

                    # Actualizar campo legado 'nombre' para mantener consistencia con Frontend
                    # cliente.nombre = f"{cliente.nombre} {cliente.apellido}".strip()
                    cliente.save()

                print(f"Cliente obtenido/creado: {cliente.id} (Creado: {created})")

                # 2. Crear Pedido
                pedido = Pedido.objects.create(
                    cliente=cliente,
                    region=validated_data.get('region', ''),
                    comuna=validated_data.get('comuna', '')
                )
                print(f"Pedido creado: {pedido.id}")

                # 3. Crear Items
                for item_data in items_data:
                    print(f"Procesando item: {item_data}")
                    producto_frecuente = None
                    if item_data.get('producto_id'):
                        try:
                            producto_frecuente = ProductoFrecuente.objects.get(id=item_data['producto_id'])
                        except ProductoFrecuente.DoesNotExist:
                            print(f"Producto frecuente ID {item_data['producto_id']} no encontrado.")
                            pass

                    ItemsPedido.objects.create(
                        pedido=pedido,
                        descripcion=item_data['descripcion'],
                        cantidad=item_data['cantidad'],
                        tipo_origen=item_data['tipo'],
                        referencia=item_data.get('referencia', ''),
                        producto_frecuente=producto_frecuente
                    )
                print("Todos los items creados correctamente.")
                return pedido
        except Exception as e:
            print(f"ERROR CRÍTICO EN CREATE SOLICITUD: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e

# Serializador para PedidoSerializer
class PedidoSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    items = ItemsPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'fecha_solicitud', 'fecha_actualizacion', 'fecha_despacho',
            'estado', 'porcentaje_urgencia', 'costo_envio_estimado',
            'transportista', 'numero_guia', 'region', 'comuna', 'metodo_envio',
            'nombre_transporte_custom', 'opciones_envio', 'items', 'id_seguimiento',
            'total_cotizacion'
        ]

# Serializador para PedidoDetailUpdateSerializer
class PedidoDetailUpdateSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    items = ItemsPedidoUpdateSerializer(many=True, required=False)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'fecha_solicitud', 'fecha_actualizacion', 'fecha_despacho',
            'estado', 'porcentaje_urgencia', 'costo_envio_estimado',
            'transportista', 'numero_guia', 'region', 'comuna', 'metodo_envio',
            'nombre_transporte_custom', 'opciones_envio', 'items', 'id_seguimiento'
        ]
        read_only_fields = ['id', 'cliente', 'fecha_solicitud', 'fecha_actualizacion', 'id_seguimiento']

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])

        instance.porcentaje_urgencia = validated_data.get('porcentaje_urgencia', instance.porcentaje_urgencia)
        instance.costo_envio_estimado = validated_data.get('costo_envio_estimado', instance.costo_envio_estimado)

        # Nuevos campos de envío
        instance.region = validated_data.get('region', instance.region)
        instance.comuna = validated_data.get('comuna', instance.comuna)
        instance.metodo_envio = validated_data.get('metodo_envio', instance.metodo_envio)
        instance.nombre_transporte_custom = validated_data.get(
            'nombre_transporte_custom', instance.nombre_transporte_custom)
        instance.opciones_envio = validated_data.get('opciones_envio', instance.opciones_envio)

        instance.save()

        print("Pedido principal actualizado con urgencia y envío.")
        print("Datos de ítems a procesar (items_data):", items_data)

        # Actualizar items existentes
        items_existentes = {item.id: item for item in instance.items.all()}

        for item_data in items_data:
            item_id = item_data.get('id')
            print(f"\nProcesando item ID: {item_id}")
            print(f"Datos del item: {item_data}")

            if item_id and item_id in items_existentes:
                item = items_existentes[item_id]

                # Actualizar cada campo explícitamente
                if 'descripcion' in item_data:
                    item.descripcion = item_data['descripcion']
                if 'cantidad' in item_data:
                    item.cantidad = item_data['cantidad']
                if 'precio_unitario' in item_data:
                    item.precio_unitario = item_data['precio_unitario']
                if 'precio_compra' in item_data:
                    item.precio_compra = item_data['precio_compra']

                item.save()
            else:
                print(f"Item ID {item_id} no encontrado en items existentes")

        return instance

# Serializador para PedidoDetailSerializer
class PedidoDetailSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    items = ItemsPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'id_seguimiento', 'estado', 'fecha_solicitud', 'cliente', 'items',
            'porcentaje_urgencia', 'costo_envio_estimado',
            'transportista', 'numero_guia',
            'region', 'comuna', 'metodo_envio', 'nombre_transporte_custom', 'opciones_envio'
        ]
