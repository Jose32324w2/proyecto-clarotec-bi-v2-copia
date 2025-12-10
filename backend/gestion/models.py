"""
Modelos de Datos de la Aplicación 'Gestion'.

PROPOSITO:
    Define la estructura de la base de datos (tablas y relaciones).
    Contiene la lógica de negocio fundamental (métodos de modelo, validaciones).

MODELOS CLAVE:
    - Cliente: Información de contacto y estado de retención (CRM).
    - Pedido: Transacción principal (Cotización -> Compra). Mantiene el estado.
    - ItemsPedido: Detalle de líneas de producto dentro de un pedido.
    - ProductoFrecuente: Catálogo de productos para facilitar la carga.
"""
import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.conf import settings  # Para referenciar al User model personalizado


class Cliente(models.Model):
    """
    Almacena la información de contacto de un cliente.
    No es un usuario del sistema, sino una entidad externa que solicita cotizaciones.
    """
    # Campos Normalizados (Singular - 3NF)
    nombre = models.CharField(max_length=255, default="", help_text="Primer nombre o nombres de pila (Ej. Juan Andrés)")
    apellido = models.CharField(max_length=255, default="", help_text="Apellido o apellidos (Ej. Pérez González)")
    empresa = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True, help_text="Email único para identificar al cliente.")
    telefono = models.CharField(max_length=50, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    # Propiedad de Compatibilidad (Legacy) - READ ONLY
    # Permite que el código antiguo que llama a 'cliente.nombre' siga funcionando
    # devolviendo el nombre completo concatenado.
    @property
    def nombre_completo(self):
        """Devuelve el nombre completo concatenado."""
        return f"{self.nombre} {self.apellido}".strip()

    # Mantenemos .nombre apuntando a la propiedad calculada
    # IMPORTANTE: Esto NO es un campo de base de datos.
    @property
    def nombre_legacy(self):
        return self.nombre_completo

    # Campos para Retención (Churn)
    last_retention_email_sent_at = models.DateTimeField(
        null=True, blank=True, help_text="Fecha del último correo de retención enviado.")
    RETENTION_STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('contacted', 'Contactado'),
        ('no_response', 'Sin Respuesta'),
        ('rejected', 'Rechazado / No Molestar'),
        ('recovered', 'Recuperado'),
    ]
    retention_status = models.CharField(max_length=20, choices=RETENTION_STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"{self.nombre_completo} ({self.empresa})"


class ProductoFrecuente(models.Model):
    """
    Productos recurrentes para agilizar la cotización.
    Permite a los vendedores seleccionar items predefinidos en lugar de ingresarlos manualmente.
    """
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    precio_referencia = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, help_text="Precio referencial para el vendedor, no visible al cliente.")
    imagen_url = models.URLField(blank=True, null=True, help_text="URL de la imagen del producto.")
    categoria = models.CharField(max_length=100, blank=True,
                                 help_text="Categoría para agrupar en el frontend (ej. Herramientas, EPP).")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Pedido(models.Model):
    """
    El modelo central que representa una solicitud, cotización y pedido.
    Gestiona todo el ciclo de vida desde la solicitud inicial hasta el despacho y finalización.
    """

    ESTADO_CHOICES = [
        ('solicitud', 'Solicitud Recibida'),
        ('cotizado', 'Cotizado y Enviado'),
        ('aceptado', 'Aceptado por Cliente'),
        ('pago_confirmado', 'Pago Confirmado'),
        ('despachado', 'Despachado'),
        ('completado', 'Completado'),
        ('rechazado', 'Rechazado por Cliente'),
    ]

    # Relaciones
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='pedidos')
    vendedor_asignado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pedidos_asignados'
    )

    # Campos de estado y seguimiento
    id_seguimiento = models.UUIDField(default=uuid.uuid4, editable=False, unique=True,
                                      help_text="ID único para el portal del cliente.")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='solicitud')

    # Campos de fecha
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    # Fase 2 git--- NUEVOS CAMPOS ---
    porcentaje_urgencia = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Porcentaje de recargo por urgencia (ej. 5.5 para 5.5%)"
    )
    costo_envio_estimado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Costo estimado del envío para la cotización."
    )

    # --- CAMPOS DE LOGÍSTICA ---
    REGION_CHOICES = [
        ('RM', 'Región Metropolitana'),
        ('NORTE', 'Zona Norte'),
        ('CENTRO', 'Zona Centro'),
        ('SUR', 'Zona Sur'),
        ('EXTREMO', 'Zona Extrema'),
    ]

    METODO_ENVIO_CHOICES = [
        ('STARKEN', 'Starken'),
        ('CHILEXPRESS', 'Chilexpress'),
        ('BLUE', 'Blue Express'),
        ('OTRO', 'Otro / Transporte Propio'),
    ]

    region = models.CharField(max_length=100, blank=True, null=True)
    comuna = models.CharField(max_length=100, blank=True, null=True)
    metodo_envio = models.CharField(max_length=50, blank=True, null=True)
    nombre_transporte_custom = models.CharField(max_length=100, blank=True, null=True)

    # Campos para despacho real
    transportista = models.CharField(max_length=100, blank=True, null=True)
    numero_guia = models.CharField(max_length=100, blank=True, null=True)
    fecha_despacho = models.DateTimeField(blank=True, null=True)

    # Fase 12: Opciones de envío múltiples
    opciones_envio = models.JSONField(default=dict, blank=True, null=True,
                                      help_text="Almacena las opciones de envío calculadas (ej. {'STARKEN': 5000, 'BLUE': 4000})")

    @property
    def total_cotizacion(self):
        """
        Calcula el total final del pedido incluyendo:
        - Subtotal de items
        - Recargo de urgencia
        - IVA (19%)
        - Costo de envío
        """
        subtotal = sum(item.cantidad * item.precio_unitario for item in self.items.all())
        recargo = subtotal * (self.porcentaje_urgencia / Decimal('100'))
        neto = subtotal + recargo
        iva = neto * Decimal('0.19')
        total = neto + iva + self.costo_envio_estimado
        return total.quantize(Decimal('1'), rounding=ROUND_HALF_UP)

    def __str__(self):
        return f"Pedido #{self.id} - {self.cliente.nombre} ({self.get_estado_display()})"


class ItemsPedido(models.Model):
    """
    Representa un item específico dentro de un pedido/cotización.
    Puede provenir de un enlace externo, ingreso manual o del catálogo de productos frecuentes.
    """

    ORIGEN_CHOICES = [
        ('LINK', 'Enlace Externo'),
        ('MANUAL', 'Ingreso Manual'),
        ('CATALOGO', 'Catálogo Frecuente'),
    ]

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='items')
    descripcion = models.TextField()
    cantidad = models.PositiveIntegerField(default=1)
    # Usamos DecimalField para precisión monetaria. NUNCA FloatField.
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    precio_compra = models.DecimalField(max_digits=10, decimal_places=0, default=0,
                                        help_text="Costo neto de compra al proveedor")
    subtotal = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    # --- NUEVOS CAMPOS FASE 2 ---
    tipo_origen = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default='MANUAL')
    referencia = models.TextField(blank=True, null=True, help_text="URL del producto o Modelo/Marca si es manual.")
    producto_frecuente = models.ForeignKey(ProductoFrecuente, on_delete=models.SET_NULL,
                                           null=True, blank=True, help_text="Referencia al producto de catálogo si aplica.")

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Item: {self.descripcion[:50]}... ({self.get_tipo_origen_display()}) para Pedido #{self.pedido.id}"
