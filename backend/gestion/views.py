from rest_framework import generics, permissions, status, viewsets
from decimal import Decimal
from django.db.models import Count, Sum, F, Case, When, Value, DecimalField
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Pedido, ProductoFrecuente, Cliente, ItemsPedido
from .serializers import (
    SolicitudCreacionSerializer, 
    PedidoSerializer, 
    PedidoDetailUpdateSerializer, 
    PedidoDetailSerializer, 
    ProductoFrecuenteSerializer, 
    ClienteSerializer
)
from .permissions import (
    IsVendedorOrGerencia, 
    IsAdministrativaOrGerencia, 
    IsDespachadorOrGerencia, 
    IsGerencia
)
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from .services import ShippingCalculator
from django.http import HttpResponse
from xhtml2pdf import pisa
from io import BytesIO


class SolicitudCreateAPIView(generics.CreateAPIView):
    """
    Endpoint público para que un cliente anónimo cree una nueva solicitud de cotización.
    """
    queryset = Pedido.objects.all()
    serializer_class = SolicitudCreacionSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        input_serializer = self.get_serializer(data=request.data)
        if not input_serializer.is_valid():
            print("Errores de validación:", input_serializer.errors)
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        pedido_creado = input_serializer.save()
        
        print(f"Nueva solicitud creada: Pedido #{pedido_creado.id}")

        output_serializer = PedidoSerializer(pedido_creado, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    
class ProductoFrecuenteListAPIView(generics.ListAPIView):
    """
    Endpoint público para obtener la lista de productos frecuentes.
    """
    queryset = ProductoFrecuente.objects.filter(activo=True)
    serializer_class = ProductoFrecuenteSerializer
    permission_classes = [permissions.AllowAny]


class SolicitudesListAPIView(generics.ListAPIView):
    """
    Endpoint protegido para que los usuarios internos (Vendedores, etc.)
    puedan ver una lista de todas las solicitudes pendientes de cotizar.
    """
    serializer_class = PedidoSerializer
    permission_classes = [IsVendedorOrGerencia]

    def get_queryset(self):
        return Pedido.objects.filter(estado='solicitud').order_by('-fecha_solicitud')


class PedidoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Endpoint protegido para ver, actualizar o eliminar un pedido específico.
    """
    queryset = Pedido.objects.all()
    serializer_class = PedidoDetailUpdateSerializer
    permission_classes = [IsVendedorOrGerencia]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            print("Errores de validación en UPDATE Pedido:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = serializer.save()
        if 'items' in self.request.data:
            instance.estado = 'cotizado'
            instance.save()


class PortalPedidoDetailAPIView(generics.RetrieveAPIView):
    """
    Endpoint público para que un cliente vea los detalles de su cotización
    usando el ID de seguimiento (UUID) único y seguro.
    """
    queryset = Pedido.objects.all()
    serializer_class = PedidoDetailSerializer  
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id_seguimiento'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Verificar validez (15 días hábiles ~ 21 días corridos)
        validez = instance.fecha_actualizacion + timezone.timedelta(days=21)
        if timezone.now() > validez and instance.estado == 'cotizado':
            instance.estado = 'rechazado' # O 'vencida' si se prefiere
            instance.save()
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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

            if not accion in ['aceptar', 'rechazar']:
                return Response({'error': 'Acción no válida.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if pedido.estado != 'cotizado':
                return Response({'error': f'No se puede realizar esta acción. El estado actual del pedido es "{pedido.get_estado_display()}".'}, status=status.HTTP_400_BAD_REQUEST)

            if accion == 'aceptar':
                pedido.estado = 'aceptado'
            elif accion == 'rechazar':
                pedido.estado = 'rechazado'
            
            pedido.save()
            print(f"El cliente ha '{accion}' el Pedido #{pedido.id}")
            
            return Response({'status': f'pedido {accion}'}, status=status.HTTP_200_OK)
        except Pedido.DoesNotExist:
            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


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
            dominio_frontend = "http://localhost:3000"
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
    permission_classes = [IsVendedorOrGerencia]


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
            'zona_detectada': zona # Asumimos misma zona para todos por ahora
        }, status=status.HTTP_200_OK)


class SeleccionarEnvioAPIView(APIView):
    """
    Permite al cliente (o admin) seleccionar una opción de envío y guardarla en el pedido.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, id_seguimiento):
        try:
            pedido = Pedido.objects.get(id_seguimiento=id_seguimiento)
            metodo = request.data.get('metodo_envio') # STARKEN, CHILEXPRESS, BLUE, OTRO
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
        return Pedido.objects.filter(estado='pago_confirmado').order_by('-fecha_actualizacion')


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
                html_message = render_to_string('email/pago_confirmado.html', {'pedido': pedido})
                plain_message = strip_tags(html_message)
                send_mail(asunto, plain_message, settings.DEFAULT_FROM_EMAIL, [pedido.cliente.email], html_message=html_message)
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
                return Response({'error': 'Se requiere transportista y número de guía.'}, status=status.HTTP_400_BAD_REQUEST)

            pedido.transportista = transportista
            pedido.numero_guia = numero_guia
            pedido.estado = 'despachado'
            pedido.fecha_despacho = timezone.now()
            pedido.save()
            
            # Enviar correo de despacho
            try:
                id_seguimiento_con_guiones = str(pedido.id_seguimiento)
                dominio_frontend = "http://localhost:3000"
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
                send_mail(asunto, plain_message, settings.DEFAULT_FROM_EMAIL, [pedido.cliente.email], html_message=html_message)
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
                        descripcion=descripcion, # Usamos la misma descripción
                        precio_referencia=item.precio_unitario, # Usamos el precio del item como referencia
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
            return Response({'error': 'Error interno al sincronizar productos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        cliente_id = request.query_params.get('cliente_id')
        
        # Filtros Multi-Select (Region y Comuna)
        # Soportamos ?region=RM,NORTE o ?region[]=RM&region[]=NORTE
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')
            
        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        if start_date:
            pedidos = pedidos.filter(fecha_despacho__date__gte=start_date)
        if end_date:
            pedidos = pedidos.filter(fecha_despacho__date__lte=end_date)
        if cliente_id:
            pedidos = pedidos.filter(cliente_id=cliente_id)
        
        if regions:
            pedidos = pedidos.filter(region__in=regions)
        if comunas:
            # Normalizamos comunas a minúsculas para búsqueda insensible si es necesario, 
            # pero asumimos que vienen limpias del frontend o coinciden con lo guardado.
            # En BD se guardan como texto libre a veces, pero idealmente coinciden con el mapa.
            pedidos = pedidos.filter(comuna__in=comunas)
        
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
                'fecha': p.fecha_despacho.strftime('%Y-%m-%d') if p.fecha_despacho else p.fecha_actualizacion.strftime('%Y-%m-%d'), # Fecha para el eje X (Fallback a actualizacion)
                'cliente': p.cliente.nombre,
                'ganancia': float(ganancia), # Decimal a float para JSON
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
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        cliente_id = request.query_params.get('cliente_id')
        
        # Filtros Multi-Select
        regions = request.query_params.getlist('region[]')
        if not regions and request.query_params.get('region'):
            regions = request.query_params.get('region').split(',')
            
        comunas = request.query_params.getlist('comuna[]')
        if not comunas and request.query_params.get('comuna'):
            comunas = request.query_params.get('comuna').split(',')

        if start_date:
            pedidos = pedidos.filter(fecha_actualizacion__date__gte=start_date)
        if end_date:
            pedidos = pedidos.filter(fecha_actualizacion__date__lte=end_date)
        if cliente_id:
            pedidos = pedidos.filter(cliente_id=cliente_id)
        if regions:
            pedidos = pedidos.filter(region__in=regions)
        if comunas:
            pedidos = pedidos.filter(comuna__in=comunas)

        # --- KPI 1: Tasa de Recurrencia ---
        # Lógica: De los clientes que aparecen en los pedidos filtrados, ¿cuántos son recurrentes (históricamente > 1 compra)?
        
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
        
        total_ingresos_global = Decimal('0.00')
        total_costos_global = Decimal('0.00')
        
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
            
            # Aplicar urgencia al ingreso
            recargo = subtotal_pedido * (p.porcentaje_urgencia / Decimal('100'))
            ingreso_neto_pedido = subtotal_pedido + recargo
            
            total_ingresos_global += ingreso_neto_pedido
            total_costos_global += costo_pedido

        margen_operacional_global = 0
        if total_ingresos_global > 0:
            utilidad_global = total_ingresos_global - total_costos_global
            margen_operacional_global = (utilidad_global / total_ingresos_global) * 100

        return Response({
            'tasa_recurrencia': round(tasa_recurrencia, 1),
            'clientes_nuevos': clientes_nuevos_count,
            'clientes_recurrentes': clientes_recurrentes_count,
            'margen_operacional': round(float(margen_operacional_global), 1),
            'total_ingresos': float(total_ingresos_global),
            'total_utilidad': float(total_ingresos_global - total_costos_global),
            'total_pedidos': pedidos.count() # Nuevo KPI: Volumen de Ventas (Cantidad)
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
