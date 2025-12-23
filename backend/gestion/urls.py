"""
Enrutamiento de la Aplicación 'Gestion'.

PROPOSITO:
    Mapea las URLs específicas de esta aplicación a sus Vistas correspondientes.
    Define la API pública y privada de la aplicación.
"""
from django.urls import path, include  # Importa path y include
from rest_framework.routers import DefaultRouter  # Importa DefaultRouter
from .views import (  # Importa las vistas
    SolicitudCreateAPIView,  # Importa SolicitudCreateAPIView
    SolicitudesListAPIView,  # Importa SolicitudesListAPIView
    PedidoDetailAPIView,  # Importa PedidoDetailAPIView
    PortalPedidoDetailAPIView,  # Importa PortalPedidoDetailAPIView
    PedidoAccionAPIView,  # Importa PedidoAccionAPIView
    EnviarCotizacionAPIView,  # Importa EnviarCotizacionAPIView
    PedidosAceptadosListView,  # Importa PedidosAceptadosListView
    PedidosHistorialPagosListView,  # Importa PedidosHistorialPagosListView
    ConfirmarPagoView,  # Importa ConfirmarPagoView
    PedidosCotizadosListView,  # Importa PedidosCotizadosListView
    PedidosParaDespacharListView,  # Importa PedidosParaDespacharListView
    PedidosHistorialDespachosListView,  # Importa PedidosHistorialDespachosListView
    MarcarComoDespachadoView,  # Importa MarcarComoDespachadoView
    ConfirmarRecepcionView,  # Importa ConfirmarRecepcionView
    ProductoFrecuenteListAPIView,  # Importa ProductoFrecuenteListAPIView
    ProductoFrecuenteViewSet,  # Importa ProductoFrecuenteViewSet
    ClienteViewSet,  # Importa ClienteViewSet
    CalcularEnvioAPIView,  # Importa CalcularEnvioAPIView
    GenerarPDFAPIView,  # Importa GenerarPDFAPIView
    SeleccionarEnvioAPIView,  # Importa SeleccionarEnvioAPIView
    PedidosHistorialCotizacionesListView,  # Importa PedidosHistorialCotizacionesListView
    SincronizarProductosAPIView,  # Importa SincronizarProductosAPIView
    RentabilidadHistoricaAPIView,  # Importa RentabilidadHistoricaAPIView
    MetricasKPIView,  # Importa MetricasKPIView
    InfoLogisticaAPIView,  # Importa InfoLogisticaAPIView
    BIDashboardDataView,  # Importa BIDashboardDataView
    ClientRetentionView,  # Importa ClientRetentionView
    SendRetentionEmailView,  # Importa SendRetentionEmailView
    UpdateClientStatusView,  # Importa UpdateClientStatusView
    RechazarPagoView,  # Importa RechazarPagoView
    ClientHistoryAPIView,  # Importa ClientHistoryAPIView
    BIFilterOptionsView,  # Importa BIFilterOptionsView
    RechazarPedidoView  # Importa RechazarPedidoView
)

# Crea un router para los endpoints CRUD
router = DefaultRouter()
# Registra los endpoints CRUD para los productos frecuentes
router.register(r'productos-crud', ProductoFrecuenteViewSet, basename='producto-crud')
# Registra los endpoints CRUD para los clientes
router.register(r'clientes-crud', ClienteViewSet, basename='cliente-crud')

# Define las URLs de la aplicación
urlpatterns = [
    # Rutas del Router (CRUDs)
    path('', include(router.urls)),  # Incluye las rutas del router

    # Endpoints específicos existentes
    path('solicitudes/', SolicitudCreateAPIView.as_view(), name='solicitud-create'),
    path('productos/frecuentes/', ProductoFrecuenteListAPIView.as_view(), name='producto-frecuente-list'),

    # Panel Vendedores / Admin
    path('pedidos/solicitudes/', SolicitudesListAPIView.as_view(), name='panel-solicitudes-list'),
    path('pedidos/<int:pk>/', PedidoDetailAPIView.as_view(), name='panel-pedido-detail'),
    path('pedidos/<int:pk>/enviar-cotizacion/', EnviarCotizacionAPIView.as_view(), name='enviar-cotizacion'),
    path('pedidos/<int:pk>/pdf/', GenerarPDFAPIView.as_view(), name='generar-pdf'),
    path('pedidos/<int:pk>/rechazar/', RechazarPedidoView.as_view(), name='pedidos-rechazar-manual'),

    # Business Intelligence
    path('bi/retention/', ClientRetentionView.as_view(), name='bi-retention'),
    path('bi/retention/email/<int:client_id>/', SendRetentionEmailView.as_view(), name='bi-retention-email'),
    path('bi/retention/status/<int:client_id>/', UpdateClientStatusView.as_view(), name='bi-retention-status'),

    # Panel Administrativa
    path('pedidos/aceptados/', PedidosAceptadosListView.as_view(), name='panel-pedidos-aceptados'),
    path('pedidos/historial-pagos/', PedidosHistorialPagosListView.as_view(), name='panel-pedidos-historial-pagos'),
    path('pedidos/<int:pk>/confirmar-pago/', ConfirmarPagoView.as_view(), name='confirmar-pago'),
    path('pedidos/<int:pk>/rechazar-pago/', RechazarPagoView.as_view(), name='rechazar-pago'),

    # Panel Vendedores (Seguimiento)
    path('pedidos/cotizados/', PedidosCotizadosListView.as_view(), name='panel-pedidos-cotizados'),
    path('cotizacion/calcular-envio/', CalcularEnvioAPIView.as_view(), name='calcular-envio'),

    # Panel Despachador
    path('pedidos/para-despachar/', PedidosParaDespacharListView.as_view(), name='panel-pedidos-despachar'),
    path('pedidos/historial-despachos/',
         PedidosHistorialDespachosListView.as_view(),
         name='panel-pedidos-historial-despachos'),
    path('pedidos/<int:pk>/marcar-despachado/', MarcarComoDespachadoView.as_view(), name='marcar-despachado'),

    # Portal Cliente
    path('portal/pedidos/<uuid:id_seguimiento>/', PortalPedidoDetailAPIView.as_view(), name='portal-pedido-detail'),
    path('portal/pedidos/<uuid:id_seguimiento>/accion/', PedidoAccionAPIView.as_view(), name='portal-pedido-accion'),
    path('portal/pedidos/<uuid:id_seguimiento>/seleccionar-envio/',
         SeleccionarEnvioAPIView.as_view(), name='portal-seleccionar-envio'),
    path('portal/pedidos/<uuid:id_seguimiento>/confirmar-recepcion/',
         ConfirmarRecepcionView.as_view(), name='portal-confirmar-recepcion'),
    path('portal/mis-pedidos/', ClientHistoryAPIView.as_view(), name='client-history'),

    # Nuevos Endpoints (Fase 13)
    path('pedidos/historial-cotizaciones/', PedidosHistorialCotizacionesListView.as_view(),
         name='panel-pedidos-historial-cotizaciones'),
    path('productos/sincronizar/', SincronizarProductosAPIView.as_view(), name='sincronizar-productos'),

    # BI
    path('bi/rentabilidad/', RentabilidadHistoricaAPIView.as_view(), name='bi-rentabilidad'),
    path('bi/kpis/', MetricasKPIView.as_view(), name='bi-kpis'),
    path('bi/dashboard-stats/', BIDashboardDataView.as_view(), name='bi-dashboard-stats'),
    path('bi/info-logistica/', InfoLogisticaAPIView.as_view(), name='bi-info-logistica'),
    path('bi/filter-options/', BIFilterOptionsView.as_view(), name='bi-filter-options'),
]
