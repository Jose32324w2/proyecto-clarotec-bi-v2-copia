from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SolicitudCreateAPIView, 
    SolicitudesListAPIView, 
    PedidoDetailAPIView, 
    PortalPedidoDetailAPIView, 
    PedidoAccionAPIView, 
    EnviarCotizacionAPIView, 
    PedidosAceptadosListView, 
    PedidosHistorialPagosListView, 
    ConfirmarPagoView, 
    PedidosCotizadosListView, 
    PedidosParaDespacharListView, 
    PedidosHistorialDespachosListView, 
    MarcarComoDespachadoView, 
    ConfirmarRecepcionView, 
    ProductoFrecuenteListAPIView, 
    ProductoFrecuenteViewSet, 
    ClienteViewSet, 
    CalcularEnvioAPIView, 
    GenerarPDFAPIView, 
    SeleccionarEnvioAPIView, 
    PedidosHistorialCotizacionesListView, 
    SincronizarProductosAPIView, 
    RentabilidadHistoricaAPIView, 
    MetricasKPIView,
    InfoLogisticaAPIView,
    BIDashboardDataView
)


router = DefaultRouter()
router.register(r'productos-crud', ProductoFrecuenteViewSet, basename='producto-crud')
router.register(r'clientes-crud', ClienteViewSet, basename='cliente-crud')

urlpatterns = [
    # Rutas del Router (CRUDs)
    path('', include(router.urls)),

    # Endpoints específicos existentes
    path('solicitudes/', SolicitudCreateAPIView.as_view(), name='solicitud-create'),
    path('productos/frecuentes/', ProductoFrecuenteListAPIView.as_view(), name='producto-frecuente-list'),
    
    # Panel Vendedores / Admin
    path('pedidos/solicitudes/', SolicitudesListAPIView.as_view(), name='panel-solicitudes-list'),
    path('pedidos/<int:pk>/', PedidoDetailAPIView.as_view(), name='panel-pedido-detail'),
    path('pedidos/<int:pk>/enviar-cotizacion/', EnviarCotizacionAPIView.as_view(), name='enviar-cotizacion'),
    path('pedidos/<int:pk>/pdf/', GenerarPDFAPIView.as_view(), name='generar-pdf'),
    
    # Panel Administrativa
    path('pedidos/aceptados/', PedidosAceptadosListView.as_view(), name='panel-pedidos-aceptados'),
    path('pedidos/historial-pagos/', PedidosHistorialPagosListView.as_view(), name='panel-pedidos-historial-pagos'),
    path('pedidos/<int:pk>/confirmar-pago/', ConfirmarPagoView.as_view(), name='confirmar-pago'),

    # Panel Vendedores (Seguimiento)
    path('pedidos/cotizados/', PedidosCotizadosListView.as_view(), name='panel-pedidos-cotizados'),
    path('cotizacion/calcular-envio/', CalcularEnvioAPIView.as_view(), name='calcular-envio'),

    # Panel Despachador
    path('pedidos/para-despachar/', PedidosParaDespacharListView.as_view(), name='panel-pedidos-despachar'),
    path('pedidos/historial-despachos/', PedidosHistorialDespachosListView.as_view(), name='panel-pedidos-historial-despachos'),
    path('pedidos/<int:pk>/marcar-despachado/', MarcarComoDespachadoView.as_view(), name='marcar-despachado'),

    # Portal Cliente
    path('portal/pedidos/<uuid:id_seguimiento>/', PortalPedidoDetailAPIView.as_view(), name='portal-pedido-detail'),
    path('portal/pedidos/<uuid:id_seguimiento>/accion/', PedidoAccionAPIView.as_view(), name='portal-pedido-accion'),
    path('portal/pedidos/<uuid:id_seguimiento>/seleccionar-envio/', SeleccionarEnvioAPIView.as_view(), name='portal-seleccionar-envio'),
    path('portal/pedidos/<uuid:id_seguimiento>/confirmar-recepcion/', ConfirmarRecepcionView.as_view(), name='portal-confirmar-recepcion'),

    # Nuevos Endpoints (Fase 13)
    path('pedidos/historial-cotizaciones/', PedidosHistorialCotizacionesListView.as_view(), name='panel-pedidos-historial-cotizaciones'),
    path('productos-crud/sincronizar/', SincronizarProductosAPIView.as_view(), name='sincronizar-productos'),
    
    # BI
    path('bi/rentabilidad/', RentabilidadHistoricaAPIView.as_view(), name='bi-rentabilidad'),
    path('bi/kpis/', MetricasKPIView.as_view(), name='bi-kpis'),
    path('bi/dashboard-stats/', BIDashboardDataView.as_view(), name='bi-dashboard-stats'),
    path('bi/info-logistica/', InfoLogisticaAPIView.as_view(), name='bi-info-logistica'),
]
