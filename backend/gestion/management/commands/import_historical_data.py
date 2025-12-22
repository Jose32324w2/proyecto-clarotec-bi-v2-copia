"""
Comando de Gestión: Importación de Datos Históricos (ETL).

PROPOSITO:
    Ejecuta el proceso ETL (Extracción, Transformación y Carga) desde un Excel.
    Simula logística y costos de envío para datos históricos.
    Puebla la base de datos para inicio del proyecto.

USO:
    python manage.py import_historical_data
"""
import pandas as pd # Importa la librería pandas para leer el archivo Excel 
import uuid # Importa la librería uuid para generar IDs únicos
import os # Importa la librería os para manejar archivos y directorios
import random # Importa la librería random para generar números aleatorios
from decimal import Decimal # Importa la librería Decimal para manejar números decimales
from datetime import timedelta # Importa la librería timedelta para manejar fechas
from django.core.management.base import BaseCommand # Importa la librería BaseCommand para crear comandos de gestión
from django.db import transaction # Importa la librería transaction para manejar transacciones
from django.utils import timezone # Importa la librería timezone para manejar fechas
from gestion.models import Cliente, Pedido, ItemsPedido # Importa los modelos Cliente, Pedido y ItemsPedido


# Clase Command que hereda de BaseCommand
class Command(BaseCommand):
    help = 'Importa datos históricos desde basis.xlsx con lógica de negocio completa (Logística simulada)'
    # Método handle (manejo) que se ejecuta cuando se ejecuta el comando
    def handle(self, *args, **kwargs):
        file_path = 'data/basis.xlsx'
        # Verifica si el archivo existe
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'Archivo no encontrado: {file_path}'))
            return 
        # Muestra mensaje de lectura del archivo
        self.stdout.write(f'Leyendo archivo: {file_path}...')
        # Lee el archivo Excel
        try:
            df = pd.read_excel(file_path)
        # Muestra mensaje de error si no se puede leer el archivo   
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error leyendo Excel: {e}'))
            return

        # --- MAPA DE REGIONES (Completo) ---
        COMUNA_REGION_MAP = {}
        REGIONES_DATA = [
            {"region": "Arica y Parinacota", "comunas": ["Arica", "Putre", "General Lagos", "Camarones"]},
            {"region": "Tarapacá", "comunas": ["Iquique", "Alto Hospicio",
                                               "Pozo Almonte", "Camiña", "Colchane", "Huara"]},
            {"region": "Antofagasta", "comunas": ["Antofagasta",
                                                  "Calama", "San Pedro de Atacama", "Taltal", "Tocopilla"]},
            {"region": "Atacama", "comunas": ["Copiapó", "Vallenar", "Caldera", "Chañaral", "Diego de Almagro"]},
            {"region": "Coquimbo", "comunas": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Andacollo"]},
            {"region": "Valparaíso", "comunas": ["Valparaíso", "Viña del Mar", "San Antonio", "Quillota", "La Ligua"]},
            {"region": "Metropolitana de Santiago", "comunas": [
                "Santiago", "Puente Alto", "Maipú", "San Bernardo", "Estación Central", "Las Condes", "Providencia", "Ñuñoa"]},
            {"region": "Libertador General Bernardo O'Higgins", "comunas": [
                "Rancagua", "San Fernando", "Santa Cruz", "Rengo"]},
            {"region": "Maule", "comunas": ["Talca", "Curicó", "Linares", "Cauquenes"]},
            {"region": "Ñuble", "comunas": ["Chillán", "San Carlos", "Coelemu", "San Nicolás", "Quillón"]},
            {"region": "Biobío", "comunas": ["Concepción", "Talcahuano", "Los Ángeles", "Chillán", "Cañete"]},
            {"region": "La Araucanía", "comunas": ["Temuco", "Angol", "Victoria", "Villarrica", "Pucón"]},
            {"region": "Los Ríos", "comunas": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli"]},
            {"region": "Los Lagos", "comunas": ["Puerto Montt", "Osorno", "Ancud", "Castro", "Frutillar"]},
            {"region": "Aysén del General Carlos Ibáñez del Campo",
                "comunas": ["Coyhaique", "Aysén", "Chile Chico", "Cochrane"]},
            {"region": "Magallanes y de la Antártica Chilena", "comunas": [
                "Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams"]}
        ]

        # Mapeamos Comuna -> Región (Completo)
        for item in REGIONES_DATA:
            for comuna in item['comunas']:
                COMUNA_REGION_MAP[comuna.lower()] = item['region']

        # --- PRECIOS BASE ZONA (Simulación ShippingCalculator) ---
        # Mapeamos Región -> Zona de Precios
        REGION_ZONA_MAP = {
            "Arica y Parinacota": "NORTE", "Tarapacá": "NORTE", "Antofagasta": "NORTE", "Atacama": "NORTE", "Coquimbo": "NORTE",
            "Valparaíso": "CENTRO", "Libertador General Bernardo O'Higgins": "CENTRO", "Maule": "CENTRO",
            "Metropolitana de Santiago": "RM",
            "Ñuble": "SUR", "Biobío": "SUR", "La Araucanía": "SUR", "Los Ríos": "SUR", "Los Lagos": "SUR",
            "Aysén del General Carlos Ibáñez del Campo": "EXTREMO", "Magallanes y de la Antártica Chilena": "EXTREMO"
        }

        # Mapeamos Zona -> Precio Base
        ZONA_PRECIOS = {
            'RM': 4500, 'CENTRO': 6500, 'NORTE': 8900, 'SUR': 7900, 'EXTREMO': 12500
        }

        # Mapeamos Courier -> Factor de Costo
        COURIERS = {
            'STARKEN': {'label': 'Starken', 'factor': 1.0},
            'CHILEXPRESS': {'label': 'Chilexpress', 'factor': 1.4},
            'BLUE': {'label': 'Blue Express', 'factor': 0.9}
        }

        # --- PROCESO ETL ---
        count_created = 0
        count_skipped = 0

        # Iniciamos una transacción
        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    # 1. Extracción de Datos Crudos
                    usuario_raw = str(row.get('Usuario', '')).strip() # Cliente
                    nombre1_raw = str(row.get('Nombre 1', '')).strip()  # Ubicación
                    movimiento_raw = str(row.get('Texto de clase-mov.', '')).strip() # Tipo de Movimiento
                    fecha_raw = row.get('Fe.contab.') # Fecha
                    material_raw = str(row.get('Texto breve de material', '')).strip() # Material
                    cantidad_raw = float(row.get('Cantidad', 0)) # Cantidad
                    doc_mat_raw = str(row.get('Doc.mat.', '')).strip() # Documento de Material

                    # Limpieza de Importe
                    importe_val = 0.0 # Importe Moneda Local (Final)
                    importe_raw = row.get('Importe ML', 0) # Importe Moneda Local (Raw) 
                    if isinstance(importe_raw, str): # Si es string
                        importe_raw = importe_raw.replace(',', '').replace('.', '')
                        # Intentamos convertir a float
                        try:
                            importe_val = float(importe_raw)
                        # Si no se puede convertir
                        except Exception: 
                            importe_val = 0.0
                    else: # Si es float
                        importe_val = float(importe_raw)

                    # 2. Cliente (Deducción)
                    if not usuario_raw or usuario_raw == 'nan':
                        usuario_raw = 'GENERICO' # Cliente Generico

                    email_gen = f"{usuario_raw}@gmail.com".lower() # Email Generico

                    if len(usuario_raw) > 1: # Si el nombre tiene mas de 1 letra 
                        first_letter = usuario_raw[0].upper() # Primera letra
                        rest = usuario_raw[1:].title() # Resto de la cadena
                        nombres_map = {'I': 'Ivan', 'P': 'Pedro', 'J': 'Juan', 'C': 'Carlos', 'A': 'Ana', 'M': 'Maria'}
                        nombre_pila = nombres_map.get(first_letter, first_letter)
                        nombre_completo = f"{nombre_pila} {rest}"
                    else:
                        nombre_completo = usuario_raw # Nombre Completo
                    # Creamos el cliente
                    cliente, _ = Cliente.objects.get_or_create(
                        email=email_gen,
                        defaults={
                            'nombre': nombre_completo, # Nombre Completo
                            'empresa': '', # Empresa
                            'telefono': '' # Telefono
                        }
                    )

                    # 3. Ubicación y Región
                    comuna_title = nombre1_raw.title() # Comuna
                    region_deducida = COMUNA_REGION_MAP.get(comuna_title.lower(), 'Metropolitana de Santiago') # Region

                    # 4. Estado
                    estado_final = 'solicitud' # Estado Final
                    if 'Entr.mercancías' in movimiento_raw:
                        estado_final = 'completado'
                    elif 'Stock en tránsito' in movimiento_raw:
                        estado_final = 'rechazado'

                    # 5. Fechas
                    if pd.isnull(fecha_raw): # Si la fecha es nula 
                        fecha_solicitud = timezone.now()
                    else: # Si la fecha es valida
                        fecha_solicitud = pd.to_datetime(fecha_raw)

                    # Fecha despacho aleatoria (3-8 días después)
                    dias_despacho = random.randint(3, 8) # Dias Despacho
                    fecha_despacho = fecha_solicitud + timedelta(days=dias_despacho) # Fecha Despacho

                    # 6. Logística (Simulación)
                    zona_precio = REGION_ZONA_MAP.get(region_deducida, 'RM') # Zona Precio
                    precio_base = ZONA_PRECIOS.get(zona_precio, 4500) # Precio Base

                    opciones_envio = {} # Opciones Envio
                    courier_keys = list(COURIERS.keys()) # Courier Keys

                    # Generar opciones
                    for key, data in COURIERS.items(): # Para cada courier
                        costo = int(precio_base * data['factor'])
                        opciones_envio[key] = costo

                    # Seleccionar uno aleatoriamente
                    selected_courier_key = random.choice(courier_keys) # Courier Key Seleccionado
                    selected_courier_data = COURIERS[selected_courier_key] # Courier Data Seleccionado
                    costo_envio_estimado = opciones_envio[selected_courier_key] # Costo Envio Estimado

                    # 7. Crear/Obtener Pedido (Agrupado por Doc.mat. si existe)
                    numero_guia = doc_mat_raw if doc_mat_raw and doc_mat_raw != 'nan' else str(uuid.uuid4()) # Numero Guia
                    # Si el numero de guia existe, obtenemos el pedido
                    pedido, created = Pedido.objects.get_or_create(
                        numero_guia=numero_guia,
                        defaults={
                            'cliente': cliente,
                            'fecha_solicitud': fecha_solicitud,
                            'estado': estado_final,
                            'region': region_deducida,
                            'comuna': comuna_title,
                            'costo_envio_estimado': Decimal(costo_envio_estimado),
                            'porcentaje_urgencia': 0,
                            'id_seguimiento': uuid.uuid4(),
                            'transportista': selected_courier_data['label'],
                            'metodo_envio': selected_courier_key,
                            'opciones_envio': opciones_envio,
                            'fecha_despacho': fecha_despacho,
                            'fecha_actualizacion': fecha_despacho  # Se actualiza al despachar
                        }
                    )

                    # Si el pedido ya existe, actualizamos  
                    if not created:
                        Pedido.objects.filter(id=pedido.id).update(
                            fecha_solicitud=fecha_solicitud,
                            fecha_actualizacion=fecha_despacho,
                            fecha_despacho=fecha_despacho
                        )
                    # Si el pedido no existe, lo creamos
                    else:
                        Pedido.objects.filter(id=pedido.id).update(
                            fecha_solicitud=fecha_solicitud,
                            fecha_actualizacion=fecha_despacho,
                            fecha_despacho=fecha_despacho
                        )

                    # 8. Crear Item y Finanzas
                    precio_unitario = importe_val / cantidad_raw if cantidad_raw > 0 else 0 # Precio Unitario
                    precio_compra = precio_unitario * 0.7 # Margen 30%

                    ItemsPedido.objects.create(
                        pedido=pedido,
                        descripcion=material_raw,
                        cantidad=int(cantidad_raw),
                        precio_unitario=Decimal(precio_unitario),
                        precio_compra=Decimal(precio_compra),
                        subtotal=Decimal(importe_val),
                        tipo_origen='MANUAL'
                    )

                    # Incrementamos el contador de items creados
                    count_created += 1

                # Si hay un error, incrementamos el contador de saltados
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Fila {index}: Error procesando ({e}).'))
                    count_skipped += 1

        # Mostramos el resultado
        self.stdout.write(self.style.SUCCESS(
            f'Proceso completado. Items creados: {count_created}. Errores/Saltados: {count_skipped}'))
