"""
Vistas y Lógica de Negocio (Controladores) de 'Gestion'.

PROPOSITO:
    Maneja las solicitudes HTTP entrantes, aplica permisos, procesa datos
    y devuelve respuestas JSON al frontend.
    Actúa como orquestador entre Serializers y Modelos.

VISTAS PRINCIPALES:
    - SolicitudCreateAPIView: Creación de cotizaciones públicas (sin login).
    - PedidoDetailAPIView/PedidoAccionAPIView: Gestión de pedidos (Backend).
    - EnviarCotizacionAPIView: Lógica de envío de correos.
    - BIDashboardDataView: Métricas agregadas para el dashboard de BI.
    - ClientRetentionView: Lógica de retención de clientes (Churn).
"""
from rest_framework import generics, permissions, status, viewsets  # Importa las dependencias
from decimal import Decimal  # Importa Decimal
from datetime import datetime  # Importa datetime
from django.db.models import Count, Sum, F, Q, Value, CharField  # Importa Count, Sum, F, Q, Value, CharField
# Importa Concat, ExtractYear, ExtractMonth, LPad, Cast
from django.db.models.functions import Concat, ExtractYear, ExtractMonth, LPad, Cast
from rest_framework.response import Response  # Importa Response
from rest_framework.views import APIView  # Importa APIView
from .models import Pedido, ProductoFrecuente, Cliente, ItemsPedido  # Importa los modelos
from .serializers import (  # Importa los serializers
    SolicitudCreacionSerializer,  # Importa SolicitudCreacionSerializer
    PedidoSerializer,  # Importa PedidoSerializer
    PedidoDetailUpdateSerializer,  # Importa PedidoDetailUpdateSerializer
    PedidoDetailSerializer,  # Importa PedidoDetailSerializer
    ProductoFrecuenteSerializer,  # Importa ProductoFrecuenteSerializer
    ClienteSerializer  # Importa ClienteSerializer
)
from .permissions import (  # Importa los permisos
    IsVendedorOrGerencia,  # Importa IsVendedorOrGerencia
    IsAdministrativaOrGerencia,  # Importa IsAdministrativaOrGerencia
    IsDespachadorOrGerencia,  # Importa IsDespachadorOrGerencia
    IsGerencia,  # Importa IsGerencia
    IsStaffMember  # Importa IsStaffMember
)
from django.core.mail import send_mail  # Importa send_mail
from django.template.loader import render_to_string  # Importa render_to_string
from django.utils.html import strip_tags  # Importa strip_tags
from django.conf import settings  # Importa settings
from django.utils import timezone  # Importa timezone
from .services import ShippingCalculator  # Importa ShippingCalculator
from django.http import HttpResponse  # Importa HttpResponse
from xhtml2pdf import pisa  # Importa pisa
from io import BytesIO  # Importa BytesIO


# Clase SolicitudCreateAPIView
class SolicitudCreateAPIView(generics.CreateAPIView):
    # queryset es el conjunto de objetos que se van a mostrar
    queryset = Pedido.objects.all()
    # serializer_class es el serializador que se va a usar
    serializer_class = SolicitudCreacionSerializer
    # permission_classes es el conjunto de permisos que se van a aplicar
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        input_serializer = self.get_serializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # orm proteccion automatica para inyeccion sql
        pedido_creado = input_serializer.save()
        output_serializer = PedidoSerializer(pedido_creado, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# Clase ProductoFrecuenteListAPIView
class ProductoFrecuenteListAPIView(generics.ListAPIView):
    # queryset es el conjunto de objetos que se van a mostrar
    queryset = ProductoFrecuente.objects.filter(activo=True)
    serializer_class = ProductoFrecuenteSerializer
    permission_classes = [permissions.AllowAny]


# Clase SolicitudesListAPIView
class SolicitudesListAPIView(generics.ListAPIView):
    serializer_class = PedidoSerializer
    permission_classes = [IsVendedorOrGerencia]

    def get_queryset(self):
        return Pedido.objects.filter(estado='solicitud').order_by('-fecha_solicitud')


# Clase PedidoDetailAPIView
class PedidoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Pedido.objects.all()
    serializer_class = PedidoDetailUpdateSerializer
    permission_classes = [IsVendedorOrGerencia]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = serializer.save()
        if 'items' in self.request.data:
            instance.estado = 'cotizado'
            instance.save()


# Clase PortalPedidoDetailAPIView
class PortalPedidoDetailAPIView(generics.RetrieveAPIView):
    queryset = Pedido.objects.all()
    serializer_class = PedidoDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id_seguimiento'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        validez = instance.fecha_actualizacion + timezone.timedelta(days=21)

        if timezone.now() > validez and instance.estado == 'cotizado':

            instance.estado = 'rechazado'  # O 'vencida' si se prefiere

            instance.save()

        serializer = self.get_serializer(instance)

        return Response(serializer.data)


# Clase PedidoAccionAPIView
class PedidoAccionAPIView(APIView):

    """

    Endpoint público para que un cliente realice acciones sobre su cotización

    (aceptar o rechazar).

    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, id_seguimiento):

        try:

            pedido = Pedido.objects.get(id_seguimiento=id_seguimiento)

            accion = request.data.get('accion')

            if accion not in ['aceptar', 'rechazar']:

                return Response({'error': 'Acción no válida.'}, status=status.HTTP_400_BAD_REQUEST)

            if pedido.estado != 'cotizado':

                return Response(
                    {
                        'error': f'No se puede realizar esta acción. El estado actual del pedido es "{
                            pedido.get_estado_display()}".'},
                    status=status.HTTP_400_BAD_REQUEST)

            if accion == 'aceptar':

                pedido.estado = 'aceptado'

            elif accion == 'rechazar':

                pedido.estado = 'rechazado'

            pedido.save()

            print(f"El cliente ha '{accion}' el Pedido #{pedido.id}")

            return Response({'status': f'pedido {accion}'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# Clase EnviarCotizacionAPIView
class EnviarCotizacionAPIView(APIView):

    """

    Endpoint protegido para enviar la cotización por correo electrónico al cliente.

    Genera un enlace único al portal del cliente y lo incluye en el cuerpo del correo.

    """

    permission_classes = [IsVendedorOrGerencia]

    def post(self, request, pk):

        try:

            pedido = Pedido.objects.get(pk=pk)

            id_seguimiento_con_guiones = str(pedido.id_seguimiento)

            dominio_frontend = settings.FRONTEND_URL

            enlace_portal = f"{dominio_frontend}/portal/pedidos/{id_seguimiento_con_guiones}"

            asunto = f"Cotización para tu Pedido #{pedido.id} - Clarotec"

            contexto = {

                'nombre_cliente': pedido.cliente.nombre,

                'pedido_id': pedido.id,

                'enlace_portal': enlace_portal,

                'items': pedido.items.all(),

            }

            html_message = render_to_string('email/cotizacion.html', contexto)

            plain_message = strip_tags(html_message)

            from_email = settings.DEFAULT_FROM_EMAIL

            to = pedido.cliente.email

            # Ensure UTF-8 encoding is handled correctly by Django's send_mail

            send_mail(asunto, plain_message, from_email, [to], html_message=html_message)

            print(f"Correo de cotización para el Pedido #{pedido.id} enviado a la consola.")

            return Response({'message': 'Correo enviado exitosamente.'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# Clase ConfirmarRecepcionView
class ConfirmarRecepcionView(APIView):

    """

    Endpoint público para que el cliente confirme que ha recibido su pedido.

    Esto cambia el estado del pedido a 'completado'.

    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, id_seguimiento):

        try:

            pedido = Pedido.objects.get(id_seguimiento=id_seguimiento)

            if pedido.estado != 'despachado':

                return Response(

                    {'error': 'Este pedido aún no ha sido despachado.'},

                    status=status.HTTP_400_BAD_REQUEST

                )

            pedido.estado = 'completado'

            pedido.save()

            print(f"El cliente ha confirmado la recepción del Pedido #{pedido.id}.")

            return Response({'status': 'pedido completado'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class ProductoFrecuenteViewSet(viewsets.ModelViewSet):

    """

    CRUD completo para productos frecuentes.

    """

    queryset = ProductoFrecuente.objects.filter(activo=True)

    serializer_class = ProductoFrecuenteSerializer

    permission_classes = [IsVendedorOrGerencia]


class ClienteViewSet(viewsets.ModelViewSet):

    """

    CRUD completo para clientes.

    """

    queryset = Cliente.objects.all()

    serializer_class = ClienteSerializer

    permission_classes = [IsStaffMember]


class CalcularEnvioAPIView(APIView):

    """

    Endpoint público/protegido para calcular el costo de envío estimado.

    Ahora devuelve múltiples opciones.

    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):

        comuna = request.data.get('comuna')

        # courier = request.data.get('courier') # Ya no es obligatorio un solo courier

        if not comuna:

            return Response({'error': 'Debe indicar una comuna.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculamos para todos los couriers disponibles

        couriers = ['STARKEN', 'CHILEXPRESS', 'BLUE']

        opciones = {}

        for c in couriers:

            costo, zona = ShippingCalculator.calcular_costo(comuna, c)

            opciones[c] = costo

        return Response({

            'comuna': comuna,

            'opciones': opciones,

            'zona_detectada': zona  # Asumimos misma zona para todos por ahora

        }, status=status.HTTP_200_OK)


class SeleccionarEnvioAPIView(APIView):

    """

    Permite al cliente (o admin) seleccionar una opción de envío y guardarla en el pedido.

    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, id_seguimiento):

        try:

            pedido = Pedido.objects.get(id_seguimiento=id_seguimiento)

            metodo = request.data.get('metodo_envio')  # STARKEN, CHILEXPRESS, BLUE, OTRO

            costo = request.data.get('costo')

            if not metodo:

                return Response({'error': 'Debe seleccionar un método de envío.'}, status=status.HTTP_400_BAD_REQUEST)

            pedido.metodo_envio = metodo

            pedido.costo_envio_estimado = costo

            pedido.save()

            return Response({'status': 'Método de envío actualizado correctly'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class GenerarPDFAPIView(APIView):

    """

    Genera un PDF descargable de la cotización usando xhtml2pdf.

    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):

        try:

            pedido = Pedido.objects.get(pk=pk)

            items = pedido.items.all()

            # Cálculos para el PDF

            subtotal = sum(item.cantidad * item.precio_unitario for item in items)

            recargo = subtotal * (pedido.porcentaje_urgencia / Decimal('100'))

            # Cálculo de IVA (19%) sobre el subtotal + recargo

            neto = subtotal + recargo

            iva = neto * Decimal('0.19')

            costo_envio = pedido.costo_envio_estimado

            total = neto + iva + costo_envio

            # Validez de 15 días hábiles (simplificado a 21 días corridos)

            validez = timezone.now() + timezone.timedelta(days=21)

            contexto = {

                'pedido': pedido,

                'items': items,

                'subtotal': subtotal,

                'recargo': recargo,

                'neto': neto,

                'iva': iva,

                'costo_envio': costo_envio,

                'total': total,

                'validez': validez,

                'fecha_actual': timezone.now(),

            }

            # Renderizamos el HTML

            html_string = render_to_string('pdf/pedido_pdf.html', contexto)

            # Generar PDF

            result = BytesIO()

            pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)

            if not pdf.err:

                response = HttpResponse(result.getvalue(), content_type='application/pdf')

                filename = f"Cotizacion_{pedido.id}.pdf"

                response['Content-Disposition'] = f'attachment; filename="{filename}"'

                return response

            else:

                return Response({'error': 'Error al generar PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class PedidosAceptadosListView(generics.ListAPIView):

    """

    Endpoint para ver los pedidos que han sido aceptados por el cliente.

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsAdministrativaOrGerencia]

    def get_queryset(self):

        return Pedido.objects.filter(estado='aceptado').order_by('-fecha_actualizacion')


class PedidosHistorialCotizacionesListView(generics.ListAPIView):

    """

    Endpoint para ver el historial de cotizaciones (aceptadas, rechazadas, completadas, despachadas).

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsVendedorOrGerencia]

    def get_queryset(self):

        # Estados que se consideran "historial"

        estados_historial = ['aceptado', 'rechazado', 'completado', 'despachado', 'pago_confirmado']

        return Pedido.objects.filter(estado__in=estados_historial).order_by('-fecha_actualizacion')


class PedidosHistorialPagosListView(generics.ListAPIView):

    """

    Endpoint para ver el historial de pedidos con pagos confirmados.

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsAdministrativaOrGerencia]

    def get_queryset(self):

        return Pedido.objects.filter(estado__in=['pago_confirmado', 'rechazado',
                                     'despachado', 'completado']).order_by('-fecha_actualizacion')


class ConfirmarPagoView(APIView):

    """

    Endpoint para que administración confirme el pago de un pedido.

    """

    permission_classes = [IsAdministrativaOrGerencia]

    def post(self, request, pk):

        try:

            pedido = Pedido.objects.get(pk=pk)

            if pedido.estado != 'aceptado':

                return Response({'error': 'El pedido no está en estado aceptado.'}, status=status.HTTP_400_BAD_REQUEST)

            pedido.estado = 'pago_confirmado'

            pedido.save()

            # Enviar correo de confirmación de pago

            try:

                asunto = f"Pago Confirmado - Pedido #{pedido.id} - Clarotec"

                id_seguimiento = str(pedido.id_seguimiento)
                enlace_portal = f"{settings.FRONTEND_URL}/portal/pedidos/{id_seguimiento}"

                contexto = {
                    'nombre_cliente': pedido.cliente.nombre,
                    'pedido_id': pedido.id,
                    'enlace_portal': enlace_portal,
                    'pedido': pedido
                }

                html_message = render_to_string('email/pago_confirmado.html', contexto)

                plain_message = strip_tags(html_message)

                send_mail(asunto, plain_message, settings.DEFAULT_FROM_EMAIL,
                          [pedido.cliente.email], html_message=html_message)

            except Exception as e:

                print(f"Error enviando correo de pago: {e}")

            return Response({'status': 'pago confirmado'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class PedidosCotizadosListView(generics.ListAPIView):

    """

    Endpoint para ver pedidos cotizados (seguimiento vendedores).

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsVendedorOrGerencia]

    def get_queryset(self):

        return Pedido.objects.filter(estado='cotizado').order_by('-fecha_actualizacion')


class PedidosParaDespacharListView(generics.ListAPIView):

    """

    Endpoint para ver pedidos listos para despacho (pago confirmado).

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsDespachadorOrGerencia]

    def get_queryset(self):

        return Pedido.objects.filter(estado='pago_confirmado').order_by('fecha_actualizacion')


class PedidosHistorialDespachosListView(generics.ListAPIView):

    """

    Endpoint para ver historial de despachos.

    """

    serializer_class = PedidoSerializer

    permission_classes = [IsDespachadorOrGerencia]

    def get_queryset(self):

        return Pedido.objects.filter(estado__in=['despachado', 'completado']).order_by('-fecha_despacho')


class MarcarComoDespachadoView(APIView):

    """

    Endpoint para marcar un pedido como despachado.

    """

    permission_classes = [IsDespachadorOrGerencia]

    def post(self, request, pk):

        try:

            pedido = Pedido.objects.get(pk=pk)

            if pedido.estado != 'pago_confirmado':

                return Response({'error': 'El pedido no está listo para despacho.'}, status=status.HTTP_400_BAD_REQUEST)

            transportista = request.data.get('transportista')

            numero_guia = request.data.get('numero_guia')

            if not transportista or not numero_guia:

                return Response({'error': 'Se requiere transportista y número de guía.'},
                                status=status.HTTP_400_BAD_REQUEST)

            pedido.transportista = transportista

            pedido.numero_guia = numero_guia

            pedido.estado = 'despachado'

            pedido.fecha_despacho = timezone.now()

            pedido.save()

            # Enviar correo de despacho

            try:

                id_seguimiento_con_guiones = str(pedido.id_seguimiento)

                dominio_frontend = settings.FRONTEND_URL

                enlace_portal = f"{dominio_frontend}/portal/pedidos/{id_seguimiento_con_guiones}"

                asunto = f"Tu Pedido #{pedido.id} ha sido Despachado - Clarotec"

                contexto = {

                    'nombre_cliente': pedido.cliente.nombre,

                    'pedido_id': pedido.id,

                    'enlace_portal': enlace_portal,

                    'transportista': transportista,

                    'numero_guia': numero_guia,

                }

                html_message = render_to_string('email/despacho.html', contexto)

                plain_message = strip_tags(html_message)

                send_mail(asunto, plain_message, settings.DEFAULT_FROM_EMAIL,
                          [pedido.cliente.email], html_message=html_message)

            except Exception as e:

                print(f"Error enviando correo de despacho: {e}")

            return Response({'status': 'pedido despachado'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:

            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class SincronizarProductosAPIView(APIView):

    """

    Endpoint para sincronizar productos desde los items de pedidos existentes hacia el catálogo de productos frecuentes.

    """

    permission_classes = [IsVendedorOrGerencia]

    def post(self, request):

        try:

            # Obtener todos los items de pedidos

            items = ItemsPedido.objects.all()

            productos_creados = 0

            for item in items:

                # Normalizar descripción para evitar duplicados por mayúsculas/minúsculas

                descripcion = item.descripcion.strip()

                # Verificar si ya existe un producto con esa descripción (exacta o insensible a mayúsculas)

                if not ProductoFrecuente.objects.filter(nombre__iexact=descripcion).exists():

                    # Crear nuevo producto frecuente

                    ProductoFrecuente.objects.create(

                        nombre=descripcion,

                        descripcion=descripcion,  # Usamos la misma descripción

                        precio_referencia=item.precio_unitario,  # Usamos el precio del item como referencia

                        categoria="Importado de Pedidos",

                        activo=True

                    )

                    productos_creados += 1

            return Response({

                'status': 'success',

                'message': f'Se han sincronizado {productos_creados} nuevos productos al catálogo.'

            }, status=status.HTTP_200_OK)

        except Exception as e:

            print(f"Error al sincronizar productos: {e}")

            return Response({'error': 'Error interno al sincronizar productos.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RentabilidadHistoricaAPIView(APIView):

    """

    Endpoint para obtener datos históricos de rentabilidad de pedidos completados.

    Se usa para gráficos de BI.

    """

    permission_classes = [IsGerencia]

    def get(self, request):

        # Filtramos solo pedidos completados (o despachados/pagados si se prefiere, pero completado es el final)

        pedidos = Pedido.objects.filter(estado='completado').order_by('fecha_despacho')

        # --- FILTROS ---
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Filtro Meses Multiple: ?month[]=2025-01&month[]=2025-02
        # Si vienen meses, ignoramos start_date/end_date (o los complementamos, pero por UI es uno u otro)
        months = request.query_params.getlist('month[]')

        if months:
            q_months = Q()
            for m in months:
                # m formt: "YYYY-MM"
                try:
                    y, m_num = m.split('-')
                    q_months |= Q(fecha_despacho__year=y, fecha_despacho__month=m_num)
                except ValueError:
                    pass
            if q_months:
                pedidos = pedidos.filter(q_months)
        else:
            # Fallback a Rango de Fechas normal
            if start_date:
                pedidos = pedidos.filter(fecha_despacho__date__gte=start_date)
            if end_date:
                pedidos = pedidos.filter(fecha_despacho__date__lte=end_date)

        # Filtro Clientes Multiple: ?cliente_id[]=1&cliente_id[]=2
        cliente_ids = request.query_params.getlist('cliente_id[]')
        if cliente_ids:
            pedidos = pedidos.filter(cliente_id__in=cliente_ids)
        elif request.query_params.get('cliente_id'):
            # Fallback single
            pedidos = pedidos.filter(cliente_id=request.query_params.get('cliente_id'))

        # Filtros Multi-Select (Region y Comuna)
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')

        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        if regions:
            pedidos = pedidos.filter(region__in=regions)
        if comunas:
            pedidos = pedidos.filter(comuna__in=comunas)

        # Filtro Tipo de Cliente Multiple
        client_types = request.query_params.getlist('client_type[]')
        # Compatibility with single param if frontend sends client_type=new
        if not client_types and request.query_params.get('client_type'):
            client_types = [request.query_params.get('client_type')]

        if client_types:
            # Logic:
            # If 'new' only -> filter new.
            # If 'recurring' only -> filter recurring.
            # If both -> do nothing (Show all).

            filter_new = 'new' in client_types
            filter_recurring = 'recurring' in client_types

            if filter_new and not filter_recurring:
                # Solo nuevos
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.exclude(cliente_id__in=recurring_client_ids)

            elif filter_recurring and not filter_new:
                # Solo recurrentes
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.filter(cliente_id__in=recurring_client_ids)

        data = []

        for p in pedidos:
            # Calcular costos e ingresos
            items = p.items.all()

            total_venta = sum(item.subtotal for item in items)

            # Recargo urgencia

            recargo = total_venta * (p.porcentaje_urgencia / Decimal('100'))

            ingreso_neto = total_venta + recargo

            costo_compra_total = sum(item.precio_compra * item.cantidad for item in items)

            ganancia = ingreso_neto - costo_compra_total

            margen = 0

            if ingreso_neto > 0:

                margen = (ganancia / ingreso_neto) * 100

            data.append({

                'id': p.id,

                # Fecha para el eje X (Fallback a actualizacion)
                'fecha': p.fecha_despacho.strftime('%Y-%m-%d') if p.fecha_despacho else p.fecha_actualizacion.strftime('%Y-%m-%d'),

                'cliente': p.cliente.nombre,

                'ganancia': float(ganancia),  # Decimal a float para JSON

                'margen': round(float(margen), 2),

                'total_venta': float(ingreso_neto)

            })

        return Response(data, status=status.HTTP_200_OK)


class MetricasKPIView(APIView):

    """

    Endpoint para obtener KPIs de BI: Tasa de Recurrencia y Margen Operacional.

    """

    permission_classes = [IsGerencia]

    def get(self, request):

        # 1. Filtros Base (Mismos que RentabilidadHistorica)

        pedidos = Pedido.objects.filter(estado='completado')

        # --- FILTROS ---
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Filtro Meses Multiple: ?month[]=2025-01
        months = request.query_params.getlist('month[]')

        if months:
            q_months = Q()
            for m in months:
                try:
                    y, m_num = m.split('-')
                    # Usamos fecha_actualizacion para KPI View consistencia
                    q_months |= Q(fecha_actualizacion__year=y, fecha_actualizacion__month=m_num)
                except ValueError:
                    pass
            if q_months:
                pedidos = pedidos.filter(q_months)
        else:
            if start_date:
                pedidos = pedidos.filter(fecha_actualizacion__date__gte=start_date)
            if end_date:
                pedidos = pedidos.filter(fecha_actualizacion__date__lte=end_date)

        # Filtro Clientes Multiple
        cliente_ids = request.query_params.getlist('cliente_id[]')
        if cliente_ids:
            pedidos = pedidos.filter(cliente_id__in=cliente_ids)
        elif request.query_params.get('cliente_id'):
            pedidos = pedidos.filter(cliente_id=request.query_params.get('cliente_id'))

        # Filtros Multi-Select (Region y Comuna)
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')

        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        if regions:
            pedidos = pedidos.filter(region__in=regions)
        if comunas:
            pedidos = pedidos.filter(comuna__in=comunas)

        # Filtro Tipo de Cliente Multiple
        client_types = request.query_params.getlist('client_type[]')
        if not client_types and request.query_params.get('client_type'):
            client_types = [request.query_params.get('client_type')]

        if client_types:
            filter_new = 'new' in client_types
            filter_recurring = 'recurring' in client_types

            if filter_new and not filter_recurring:
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.exclude(cliente_id__in=recurring_client_ids)

            elif filter_recurring and not filter_new:
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.filter(cliente_id__in=recurring_client_ids)

        # --- KPI 1: Tasa de Recurrencia ---
        # Lógica: De los clientes que aparecen en los pedidos filtrados, ¿cuántos
        # son recurrentes (históricamente > 1 compra)?

        # Obtener IDs de clientes en el set filtrado
        clientes_en_periodo_ids = pedidos.values_list('cliente_id', flat=True).distinct()
        total_clientes_periodo = len(clientes_en_periodo_ids)

        clientes_recurrentes_count = 0
        clientes_nuevos_count = 0

        if total_clientes_periodo > 0:
            # Consultar historial completo de estos clientes
            # Anotamos cada cliente con su conteo total de pedidos completados históricos
            clientes_stats = Pedido.objects.filter(
                cliente_id__in=clientes_en_periodo_ids,
                estado='completado'
            ).values('cliente').annotate(total_historico=Count('id'))

            for stat in clientes_stats:
                if stat['total_historico'] > 1:
                    clientes_recurrentes_count += 1
                else:
                    clientes_nuevos_count += 1

            tasa_recurrencia = (clientes_recurrentes_count / total_clientes_periodo) * 100
        else:
            tasa_recurrencia = 0

        # --- KPI 2: Margen Operacional Global ---
        # Lógica: Sumar (Ingresos - Costos) / Ingresos de todos los pedidos filtrados.
        # Reutilizamos lógica de cálculo iterativo por simplicidad y consistencia con RentabilidadHistoricaView
        # (Aunque podría optimizarse con agregaciones complejas, el cálculo de urgencia lo hace difícil en DB pura sin funciones complejas)

        total_ingresos_netos = Decimal('0.00')  # Subtotal + Recargo (Sin IVA/Envio)
        total_facturado_real = Decimal('0.00')  # Con IVA y Envio
        total_costos_global = Decimal('0.00')
        total_utilidad_neta = Decimal('0.00')
        total_iva = Decimal('0.00')
        total_envios = Decimal('0.00')

        # Iteramos sobre el queryset filtrado 'pedidos' (que ya tiene prefetch de items idealmente, pero aquí no lo forzamos por ahora)
        # Para optimizar, hacemos prefetch
        pedidos_con_items = pedidos.prefetch_related('items')

        for p in pedidos_con_items:
            # Sumar items
            subtotal_pedido = Decimal('0.00')
            costo_pedido = Decimal('0.00')

            for item in p.items.all():
                subtotal_pedido += item.subtotal
                costo_pedido += (item.precio_compra * item.cantidad)

            # Ingreso Neto (Base para margen)
            recargo = subtotal_pedido * (p.porcentaje_urgencia / Decimal('100'))
            ingreso_neto_pedido = subtotal_pedido + recargo

            # IVA
            iva_pedido = ingreso_neto_pedido * Decimal('0.19')
            envio_pedido = p.costo_envio_estimado

            # Acumuladores
            total_ingresos_netos += ingreso_neto_pedido
            total_facturado_real += p.total_cotizacion  # Usamos propiedad del modelo (Gross Model)
            total_costos_global += costo_pedido

            # Desgloses
            total_iva += iva_pedido
            total_envios += envio_pedido

            # Utilidad Neta Real (Neto - Costo)
            total_utilidad_neta += (ingreso_neto_pedido - costo_pedido)

        margen_operacional_global = 0
        if total_ingresos_netos > 0:
            # Margen = Utilidad / Ingresos Netos (Sin IVA)
            margen_operacional_global = (total_utilidad_neta / total_ingresos_netos) * 100

        return Response({
            'tasa_recurrencia': round(tasa_recurrencia, 1),
            'clientes_nuevos': clientes_nuevos_count,
            'clientes_recurrentes': clientes_recurrentes_count,
            'margen_operacional': round(float(margen_operacional_global), 1),
            'total_ingresos': int(round(total_facturado_real)),  # Bruto Real (Entero)
            'total_neto': int(round(total_ingresos_netos)),  # Neto (Entero)
            'total_costos': int(round(total_costos_global)),
            'total_utilidad': int(round(total_utilidad_neta)),
            'total_iva': int(round(total_iva)),
            'total_envios': int(round(total_envios)),
            'total_pedidos': pedidos.count()
        }, status=status.HTTP_200_OK)


class InfoLogisticaAPIView(APIView):
    """
    Endpoint para obtener información logística estática (Regiones y Comunas)
    para poblar filtros en el frontend.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Invertir el mapa de ShippingCalculator: { 'comuna': 'zona' } -> { 'zona': ['comuna1', 'comuna2'] }
        zona_comunas = {}

        # Orden de zonas deseado
        zonas_orden = ['RM', 'NORTE', 'CENTRO', 'SUR', 'EXTREMO']
        for z in zonas_orden:
            zona_comunas[z] = []

        for comuna, zona in ShippingCalculator.COMUNA_ZONA_MAP.items():
            # Capitalizar nombre comuna para mostrar bonito
            comuna_display = comuna.title()

            if zona in zona_comunas:
                zona_comunas[zona].append(comuna_display)
            else:
                # Fallback por si hay zonas no listadas en el orden
                if zona not in zona_comunas:
                    zona_comunas[zona] = []
                zona_comunas[zona].append(comuna_display)

        # Ordenar alfabéticamente las comunas dentro de cada zona
        for zona in zona_comunas:
            zona_comunas[zona].sort()

        return Response(zona_comunas, status=status.HTTP_200_OK)


class BIDashboardDataView(APIView):
    """
    Endpoint para obtener datos agregados para el Dashboard Avanzado de BI.
    Retorna: Top Productos, Ventas por Región, Tendencia Mensual.
    """
    permission_classes = [IsGerencia]

    def get(self, request):
        # Filtros Base (Igual que los otros endpoints de BI)
        pedidos = Pedido.objects.filter(estado='completado')

        # --- FILTROS ---
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Filtro Meses Multiple: ?month[]=2025-01
        months = request.query_params.getlist('month[]')

        if months:
            q_months = Q()
            for m in months:
                try:
                    y, m_num = m.split('-')
                    # Usamos fecha_despacho para BIDashboardDataView
                    q_months |= Q(fecha_despacho__year=y, fecha_despacho__month=m_num)
                except ValueError:
                    pass
            if q_months:
                pedidos = pedidos.filter(q_months)
        else:
            if start_date:
                pedidos = pedidos.filter(fecha_despacho__date__gte=start_date)
            if end_date:
                pedidos = pedidos.filter(fecha_despacho__date__lte=end_date)

        # Filtro Clientes Multiple
        cliente_ids = request.query_params.getlist('cliente_id[]')
        if cliente_ids:
            pedidos = pedidos.filter(cliente_id__in=cliente_ids)
        elif request.query_params.get('cliente_id'):
            pedidos = pedidos.filter(cliente_id=request.query_params.get('cliente_id'))

        # Filtros Multi-Select (Region y Comuna)
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')

        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        if regions:
            pedidos = pedidos.filter(region__in=regions)
        if comunas:
            pedidos = pedidos.filter(comuna__in=comunas)

        # Filtro Tipo de Cliente Multiple
        client_types = request.query_params.getlist('client_type[]')
        if not client_types and request.query_params.get('client_type'):
            client_types = [request.query_params.get('client_type')]

        if client_types:
            filter_new = 'new' in client_types
            filter_recurring = 'recurring' in client_types

            if filter_new and not filter_recurring:
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.exclude(cliente_id__in=recurring_client_ids)

            elif filter_recurring and not filter_new:
                recurring_client_ids = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    count=Count('id')
                ).filter(count__gt=1).values_list('cliente_id', flat=True)
                pedidos = pedidos.filter(cliente_id__in=recurring_client_ids)

        # 1. Top 10 Productos (Por Ingresos)
        # Necesitamos unir con ItemsPedido
        top_products_qs = ItemsPedido.objects.filter(pedido__in=pedidos).values('descripcion').annotate(
            total_vendido=Sum('subtotal'),
            cantidad_total=Sum('cantidad')
        ).order_by('-total_vendido')[:10]

        top_products = [
            {
                # Truncar nombre largo
                'name': item['descripcion'][:20] + '...' if len(item['descripcion']) > 20 else item['descripcion'],
                'full_name': item['descripcion'],
                'value': float(item['total_vendido']),
                'cantidad': item['cantidad_total']
            }
            for item in top_products_qs
        ]

        # 2. Ventas por Región
        # Corrección: Agrupar desde ItemsPedido es más seguro para sumas
        sales_by_region_qs = ItemsPedido.objects.filter(pedido__in=pedidos).values('pedido__region').annotate(
            total_ventas=Sum('subtotal')
        ).order_by('-total_ventas')

        sales_by_region = [
            {
                'name': item['pedido__region'],
                'value': float(item['total_ventas'])
            }
            for item in sales_by_region_qs
        ]

        # 3. Tendencia Mensual de Ingresos (Cálculo corregido en Python para usar total_cotizacion)
        monthly_data = {}

        # Iteramos sobre los pedidos únicos para sumar sus totales reales (incluyendo IVA, etc)
        # pedidos ya está filtrado por fechas/cliente/region etc
        # Hacemos prefetch de items para optimizar el cálculo de costos dentro del bucle si es necesario
        pedidos_trend = pedidos.prefetch_related('items')

        for p in pedidos_trend:
            fecha = p.fecha_despacho if p.fecha_despacho else p.fecha_actualizacion
            month_key = fecha.strftime('%Y-%m')

            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'ventas': Decimal('0.00'),
                    'costos': Decimal('0.00'),
                    'utilidad': Decimal('0.00')
                }

            # Ventas: Usamos el TOTAL REAL (Subtotal + Recargo + IVA + Envío)
            monthly_data[month_key]['ventas'] += p.total_cotizacion

            # Costos: Suma de costo de compra de items
            costo_pedido = sum(item.precio_compra * item.cantidad for item in p.items.all())
            monthly_data[month_key]['costos'] += costo_pedido

            # Utilidad Neta: (Subtotal + Recargo) - Costos
            # No usamos total_cotizacion aquí porque incluye IVA y Envío
            subtotal_items = sum(item.subtotal for item in p.items.all())
            recargo = subtotal_items * (p.porcentaje_urgencia / Decimal('100'))
            ingreso_neto_real = subtotal_items + recargo

            monthly_data[month_key]['utilidad'] += (ingreso_neto_real - costo_pedido)

        # Convertir diccionario a lista ordenada
        monthly_trend = []
        for month_key in sorted(monthly_data.keys()):
            ventas = monthly_data[month_key]['ventas']
            costos = monthly_data[month_key]['costos']
            # La utilidad ya fue sumada correctamente en el bucle
            utilidad = monthly_data[month_key]['utilidad']

            monthly_trend.append({
                'name': month_key,
                'ventas': float(ventas),
                'costos': float(costos),
                'utilidad': float(utilidad)
            })

        return Response({
            'top_products': top_products,
            'sales_by_region': sales_by_region,
            'monthly_trend': monthly_trend
        }, status=status.HTTP_200_OK)


class ClientRetentionView(APIView):
    """
    Endpoint para el Dashboard de Retención de Clientes (Churn).
    Clasifica a los clientes en:
    - Activo (< 30 días sin comprar)
    - En Riesgo (30 - 90 días sin comprar)
    - Perdido (> 90 días sin comprar)

    Soporta filtros por región y comuna (basado en la última compra).
    """
    permission_classes = [IsVendedorOrGerencia]

    def get(self, request):
        # Filtros
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')

        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        search_query = request.query_params.get('search', '').lower()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Obtenemos todos los clientes
        clientes = Cliente.objects.all()

        # Filtro de Búsqueda (Nombre, Email, Empresa)
        if search_query:
            clientes = clientes.filter(
                Q(nombre__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(empresa__icontains=search_query)
            )

        data = []
        now = timezone.now()

        # Contadores para las tarjetas de resumen
        summary = {
            'active': 0,
            'risk': 0,
            'lost': 0,
            'total_clients': 0
        }

        for cliente in clientes:
            # Buscar la última fecha de un pedido COMPLETADO o DESPACHADO (Venta real)
            last_order_qs = Pedido.objects.filter(
                cliente=cliente,
                estado__in=['completado', 'despachado', 'pagado', 'aceptado']
            )

            # Filtro de Fechas (sobre la última compra)
            # Nota: Esto es sutil. Si filtramos por fecha, ¿queremos clientes cuya ÚLTIMA compra fue en ese rango?
            # Sí, para ver "quién compró por última vez en Enero".

            last_order = last_order_qs.order_by('-fecha_solicitud').first()

            # --- FILTRADO POR FECHA DE ÚLTIMA COMPRA ---
            if start_date or end_date:
                if not last_order:
                    continue  # Si no tiene compras, no entra en rango de fechas

                last_date = last_order.fecha_solicitud.date()
                if start_date and last_date < datetime.strptime(start_date, '%Y-%m-%d').date():
                    continue
                if end_date and last_date > datetime.strptime(end_date, '%Y-%m-%d').date():
                    continue

            # --- FILTRADO POR REGIÓN/COMUNA ---
            if regions or comunas:
                if not last_order:
                    continue

                if regions and last_order.region not in regions:
                    continue
                if comunas and last_order.comuna not in comunas:
                    continue

            # Calcular Total Gastado (Lifetime Value)
            total_spent = ItemsPedido.objects.filter(
                pedido__cliente=cliente,
                pedido__estado__in=['completado', 'despachado', 'pagado', 'aceptado']
            ).aggregate(total=Sum(F('cantidad') * F('precio_unitario')))['total'] or 0

            days_inactive = -1
            status_label = 'N/A'
            last_product = "Sin compras"

            if last_order:
                diff = now - last_order.fecha_solicitud
                days_inactive = diff.days

                # Clasificación
                if days_inactive <= 30:
                    status_label = 'active'
                    summary['active'] += 1
                elif days_inactive <= 90:
                    status_label = 'risk'
                    summary['risk'] += 1
                else:
                    status_label = 'lost'
                    summary['lost'] += 1

                # Obtener último producto comprado para "excusa de conversación"
                last_item = last_order.items.first()
                if last_item:
                    last_product = last_item.descripcion
            else:
                status_label = 'lost'
                summary['lost'] += 1
                days_inactive = 999

            summary['total_clients'] += 1

            data.append({
                'id': cliente.id,
                'nombre': f"{cliente.nombre} {cliente.apellido}".strip(),  # Concatenado para visualización
                'nombres': cliente.nombre,
                'apellidos': cliente.apellido,
                'email': cliente.email,
                'telefono': cliente.telefono,
                'empresa': cliente.empresa,
                'days_inactive': days_inactive,
                'status': status_label,
                'total_spent': total_spent,
                'last_product': last_product,
                'last_order_date': last_order.fecha_solicitud if last_order else None,
                'region': last_order.region if last_order else None,
                'comuna': last_order.comuna if last_order else None,
                'last_retention_email_sent_at': cliente.last_retention_email_sent_at,
                'retention_status': cliente.retention_status,
                'retention_status_display': cliente.get_retention_status_display()
            })

        def sort_key(item):
            priority = {'risk': 0, 'lost': 1, 'active': 2}
            return (priority.get(item['status'], 3), -item['total_spent'])

        data.sort(key=sort_key)

        return Response({
            'summary': summary,
            'clients': data
        })


class SendRetentionEmailView(APIView):
    """
    Endpoint para enviar correo de retención (Churn) a un cliente específico.
    Selecciona plantilla según estado (Riesgo vs Perdido) y actualiza estado del cliente.
    """
    permission_classes = [IsVendedorOrGerencia]

    def post(self, request, client_id):
        try:
            cliente = Cliente.objects.get(pk=client_id)

            # Buscar última compra para personalizar el correo
            last_order = Pedido.objects.filter(
                cliente=cliente,
                estado__in=['completado', 'despachado', 'pagado', 'aceptado']
            ).order_by('-fecha_solicitud').first()

            days_inactive = 0

            if last_order:
                days_inactive = (timezone.now() - last_order.fecha_solicitud).days
            else:
                days_inactive = 999  # Nunca compró o muy antiguo

            # Selección de Plantilla
            template_name = 'email/retention_risk.html'
            if days_inactive > 90:
                template_name = 'email/retention_lost.html'

            # Contexto para la plantilla
            contexto = {
                'nombre_cliente': cliente.nombre,
                'days_inactive': days_inactive if days_inactive > 0 else "varios",
            }

            # Renderizar correo
            html_message = render_to_string(template_name, contexto)
            plain_message = strip_tags(html_message)

            asunto = f"¡Te extrañamos en Clarotec, {cliente.nombre}!"
            from_email = settings.DEFAULT_FROM_EMAIL
            to = cliente.email

            send_mail(asunto, plain_message, from_email, [to], html_message=html_message)

            # Actualizar estado del cliente
            cliente.last_retention_email_sent_at = timezone.now()
            cliente.retention_status = 'contacted'
            cliente.save()

            return Response({'status': 'success',
                             'message': f'Correo enviado a {cliente.email}'},
                            status=status.HTTP_200_OK)

        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error enviando correo de retención: {e}")
            return Response({'error': 'Error al enviar el correo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateClientStatusView(APIView):
    """
    Endpoint para actualizar manualmente el estado de retención de un cliente.
    Ej: Marcar como "Rechazado" o "Recuperado".
    """
    permission_classes = [IsVendedorOrGerencia]

    def post(self, request, client_id):
        try:
            cliente = Cliente.objects.get(pk=client_id)
            new_status = request.data.get('status')

            valid_statuses = [choice[0] for choice in Cliente.RETENTION_STATUS_CHOICES]

            if new_status not in valid_statuses:
                return Response({'error': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)

            cliente.retention_status = new_status
            cliente.save()

            return Response({'status': 'success', 'message': 'Estado actualizado.'}, status=status.HTTP_200_OK)

        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class RechazarPagoView(APIView):
    """
    Endpoint para que un administrativo rechace el pago de un pedido.
    Cambia el estado a 'rechazado' y notifica al cliente.
    """
    permission_classes = [IsVendedorOrGerencia]  # Administrativa tambien

    def post(self, request, pk):
        try:
            pedido = Pedido.objects.get(pk=pk, estado='aceptado')  # Solo rechazar si está en espera de pago/aceptado

            # Cambiar estado a Rechazado
            pedido.estado = 'rechazado'
            pedido.save()

            # Enviar correo
            try:
                asunto = f"Problema con tu Pago - Pedido #{pedido.id} - Clarotec"
                html_message = render_to_string('email/pago_rechazado.html', {'pedido': pedido})
                plain_message = strip_tags(html_message)
                send_mail(asunto, plain_message, settings.DEFAULT_FROM_EMAIL,
                          [pedido.cliente.email], html_message=html_message)
            except Exception as e:
                print(f"Error enviando correo de rechazo: {e}")

            return Response({'status': 'pago rechazado'}, status=status.HTTP_200_OK)

        except Pedido.DoesNotExist:
            return Response({'error': 'Pedido no encontrado o estado incorrecto.'}, status=status.HTTP_404_NOT_FOUND)


class ClientHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. Obtener email del usuario logueado
        user_email = request.user.email

        # 2. Buscar pedidos asociados a ese email (a través del Cliente)
        # Nota: El link es por email, ya que el usuario 'Cliente' y la ficha 'Cliente' comparten email.
        pedidos = Pedido.objects.filter(cliente__email=user_email).order_by('-fecha_solicitud')

        # 3. Serializar (Usamos el serializer de lista o detalle simplificado)
        # Reutilizamos PedidoSerializer o construimos una respuesta custom
        data = []
        for p in pedidos:
            # Usar la propiedad del modelo que incluye IVA y recargos
            total = p.total_cotizacion

            data.append({
                'id': p.id,
                'fecha_solicitud': p.fecha_solicitud,
                'estado': p.estado,
                'total_cotizacion': total,
                'id_seguimiento': p.id_seguimiento,
                'items_count': p.items.count()
            })

        return Response(data, status=status.HTTP_200_OK)


class BIFilterOptionsView(APIView):
    """
    Endpoint para obtener opciones de filtros dinámicos (Facetas).
    Aplica lógica de 'Exclusión' para permitir selección múltiple dentro de una misma categoría.
    Ej: Al filtrar por Mes X, las opciones de Meses siguen mostrando todos los meses disponibles
    (filtrados por Cliente/Región), no solo X.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_filtered_queryset(self, request, exclude_params=[]):
        """
        Helper para construir un QuerySet aplicando todos los filtros
        EXCEPTO los especificados en 'exclude_params'.
        """
        pedidos = Pedido.objects.filter(estado='completado')

        # 1. Filtros FECHAS (Globales, impactan a todos menos quizás a Meses si se excluye)
        # Nota: 'month[]' y 'start_date' actúan como filtro temporal.
        # Si excluimos 'months', NO aplicamos ni month[] ni start_date/end_date
        # para que aparezcan todos los tiempos disponibles.

        apply_time_filter = 'months' not in exclude_params

        if apply_time_filter:
            months = request.query_params.getlist('month[]')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            if months:
                q_months = Q()
                for m_str in months:
                    try:
                        year, month = m_str.split('-')
                        q_months |= Q(fecha_actualizacion__year=year, fecha_actualizacion__month=month)
                    except ValueError:
                        pass
                if q_months:
                    pedidos = pedidos.filter(q_months)
            else:
                if start_date:
                    pedidos = pedidos.filter(fecha_actualizacion__date__gte=start_date)
                if end_date:
                    pedidos = pedidos.filter(fecha_actualizacion__date__lte=end_date)

        # 2. Clientes
        if 'clients' not in exclude_params:
            cliente_ids = request.query_params.getlist('cliente_id[]')
            if cliente_ids:
                pedidos = pedidos.filter(cliente_id__in=cliente_ids)
            elif request.query_params.get('cliente_id'):
                pedidos = pedidos.filter(cliente_id=request.query_params.get('cliente_id'))

        # 3. Tipos de Cliente
        if 'client_types' not in exclude_params:
            client_types = request.query_params.getlist('client_type[]')
            if client_types:
                filter_new = 'new' in client_types
                filter_recurring = 'recurring' in client_types

                # Sub-query común para identificar recurrentes
                recurring_qs = Pedido.objects.filter(estado='completado').values('cliente').annotate(
                    cnt=Count('id')).filter(cnt__gt=1).values('cliente')

                if filter_new and not filter_recurring:
                    pedidos = pedidos.exclude(cliente_id__in=recurring_qs)
                elif filter_recurring and not filter_new:
                    pedidos = pedidos.filter(cliente_id__in=recurring_qs)

        # 4. Región
        apply_region = 'regions' not in exclude_params
        if apply_region:
            regions = request.query_params.getlist('region[]')
            if not regions and request.query_params.get('region'):
                regions = request.query_params.get('region').split(',')
            if regions:
                pedidos = pedidos.filter(region__in=regions)

        # 5. Comuna
        # (Generalmente depende de región, pero en facetas cruzadas, si filtro comuna, limito clientes)
        if 'comunas' not in exclude_params:
            comunas = request.query_params.getlist('comuna[]')
            if not comunas and request.query_params.get('comuna'):
                comunas = request.query_params.get('comuna').split(',')
            if comunas:
                pedidos = pedidos.filter(comuna__in=comunas)

        return pedidos

    def get(self, request):
        # Generar QuerySets independientes para cada faceta

        # 1. Clientes Disponibles (Filtrado por todo EXCEPTO Clientes)
        # CORRECCIÓN: 'client_types' SÍ debe filtrar a los clientes.
        # Si selecciono "Nuevos", solo quiero ver clientes nuevos en la lista.
        qs_clients = self._get_filtered_queryset(request, exclude_params=['clients'])
        available_client_ids = qs_clients.values_list('cliente_id', flat=True).distinct()

        # 2. Regiones Disponibles (Filtrado por todo EXCEPTO Region/Comuna)
        # Nota: Si selecciono una Comuna, ¿debo ver otras Regiones? Sí, para poder cambiar.
        qs_regions = self._get_filtered_queryset(request, exclude_params=['regions', 'comunas'])
        available_regions = qs_regions.exclude(
            region__isnull=True).exclude(
            region='').values_list(
            'region',
            flat=True).distinct()

        # 3. Comunas Disponibles
        # AQUI hay un matiz: Las comunas SI deben limitarse por la REGIÓN seleccionada (Jerárquico),
        # pero NO por la Comuna seleccionada (para permitir cambiar de comuna dentro de la región).
        # Así que excluimos 'comunas' pero MANTENEMOS 'regions' (por defecto no está en exclude).
        qs_comunas = self._get_filtered_queryset(request, exclude_params=['comunas'])
        available_comunas = qs_comunas.exclude(
            comuna__isnull=True).exclude(
            comuna='').values_list(
            'comuna',
            flat=True).distinct()

        # 4. Meses Disponibles (Filtrado por todo EXCEPTO Fecha)
        qs_months = self._get_filtered_queryset(request, exclude_params=['months'])
        available_months = qs_months.annotate(
            month_str=Concat(
                ExtractYear('fecha_actualizacion'),
                Value('-'),
                LPad(Cast(ExtractMonth('fecha_actualizacion'), CharField()), 2, Value('0')),
                output_field=CharField()
            )
        ).values_list('month_str', flat=True).distinct().order_by('-month_str')

        return Response({
            'clients': list(available_client_ids),
            'regions': list(available_regions),
            'comunas': list(available_comunas),
            'months': list(available_months)
        }, status=status.HTTP_200_OK)


class RechazarPedidoView(APIView):
    """
    Endpoint para rechazar/cancelar manualmente una solicitud o cotización.
    Cambia el estado a 'rechazado'.
    """
    permission_classes = [IsVendedorOrGerencia]

    def post(self, request, pk):
        try:
            pedido = Pedido.objects.get(pk=pk)
            # Validar estados permitidos para rechazar
            if pedido.estado not in ['solicitud', 'cotizado', 'aceptado']:  # Aceptado tb por si acaso
                return Response({'error': f'No se puede rechazar un pedido en estado {pedido.estado}.'},
                                status=status.HTTP_400_BAD_REQUEST)

            pedido.estado = 'rechazado'
            pedido.save()
            return Response({'status': 'Pedido rechazado correctamente'}, status=status.HTTP_200_OK)
        except Pedido.DoesNotExist:
            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
