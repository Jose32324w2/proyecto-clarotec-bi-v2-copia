import pandas as pd
import uuid
import os
import json
import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from gestion.models import Cliente, Pedido, ItemsPedido
from gestion.services import ShippingCalculator

class Command(BaseCommand):
    help = 'Importa datos históricos desde basis.xlsx con lógica de negocio completa (Logística simulada)'

    def handle(self, *args, **kwargs):
        file_path = 'data/basis.xlsx'
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'Archivo no encontrado: {file_path}'))
            return

        self.stdout.write(f'Leyendo archivo: {file_path}...')
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error leyendo Excel: {e}'))
            return

        # --- MAPA DE REGIONES (Completo) ---
        COMUNA_REGION_MAP = {}
        REGIONES_DATA = [
            {"region": "Arica y Parinacota", "comunas": ["Arica", "Putre", "General Lagos", "Camarones"]},
            {"region": "Tarapacá", "comunas": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara"]},
            {"region": "Antofagasta", "comunas": ["Antofagasta", "Calama", "San Pedro de Atacama", "Taltal", "Tocopilla"]},
            {"region": "Atacama", "comunas": ["Copiapó", "Vallenar", "Caldera", "Chañaral", "Diego de Almagro"]},
            {"region": "Coquimbo", "comunas": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Andacollo"]},
            {"region": "Valparaíso", "comunas": ["Valparaíso", "Viña del Mar", "San Antonio", "Quillota", "La Ligua"]},
            {"region": "Metropolitana de Santiago", "comunas": ["Santiago", "Puente Alto", "Maipú", "San Bernardo", "Estación Central", "Las Condes", "Providencia", "Ñuñoa"]},
            {"region": "Libertador General Bernardo O'Higgins", "comunas": ["Rancagua", "San Fernando", "Santa Cruz", "Rengo"]},
            {"region": "Maule", "comunas": ["Talca", "Curicó", "Linares", "Cauquenes"]},
            {"region": "Ñuble", "comunas": ["Chillán", "San Carlos", "Coelemu", "San Nicolás", "Quillón"]},
            {"region": "Biobío", "comunas": ["Concepción", "Talcahuano", "Los Ángeles", "Chillán", "Cañete"]},
            {"region": "La Araucanía", "comunas": ["Temuco", "Angol", "Victoria", "Villarrica", "Pucón"]},
            {"region": "Los Ríos", "comunas": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli"]},
            {"region": "Los Lagos", "comunas": ["Puerto Montt", "Osorno", "Ancud", "Castro", "Frutillar"]},
            {"region": "Aysén del General Carlos Ibáñez del Campo", "comunas": ["Coyhaique", "Aysén", "Chile Chico", "Cochrane"]},
            {"region": "Magallanes y de la Antártica Chilena", "comunas": ["Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams"]}
        ]

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
        
        ZONA_PRECIOS = {
            'RM': 4500, 'CENTRO': 6500, 'NORTE': 8900, 'SUR': 7900, 'EXTREMO': 12500
        }
        
        COURIERS = {
            'STARKEN': {'label': 'Starken', 'factor': 1.0},
            'CHILEXPRESS': {'label': 'Chilexpress', 'factor': 1.4},
            'BLUE': {'label': 'Blue Express', 'factor': 0.9}
        }

        count_created = 0
        count_skipped = 0

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    # 1. Extracción de Datos Crudos
                    usuario_raw = str(row.get('Usuario', '')).strip()
                    nombre1_raw = str(row.get('Nombre 1', '')).strip() # Ubicación
                    movimiento_raw = str(row.get('Texto de clase-mov.', '')).strip()
                    fecha_raw = row.get('Fe.contab.')
                    material_raw = str(row.get('Texto breve de material', '')).strip()
                    cantidad_raw = float(row.get('Cantidad', 0))
                    doc_mat_raw = str(row.get('Doc.mat.', '')).strip()
                    
                    # Limpieza de Importe
                    importe_val = 0.0
                    importe_raw = row.get('Importe ML', 0)
                    if isinstance(importe_raw, str):
                        importe_raw = importe_raw.replace(',', '').replace('.', '')
                        try:
                            importe_val = float(importe_raw)
                        except:
                            importe_val = 0.0
                    else:
                        importe_val = float(importe_raw)

                    # 2. Cliente (Deducción)
                    if not usuario_raw or usuario_raw == 'nan':
                        usuario_raw = 'GENERICO'
                    
                    email_gen = f"{usuario_raw}@gmail.com".lower()
                    
                    if len(usuario_raw) > 1:
                        first_letter = usuario_raw[0].upper()
                        rest = usuario_raw[1:].title()
                        nombres_map = {'I': 'Ivan', 'P': 'Pedro', 'J': 'Juan', 'C': 'Carlos', 'A': 'Ana', 'M': 'Maria'}
                        nombre_pila = nombres_map.get(first_letter, first_letter)
                        nombre_completo = f"{nombre_pila} {rest}"
                    else:
                        nombre_completo = usuario_raw

                    cliente, _ = Cliente.objects.get_or_create(
                        email=email_gen,
                        defaults={
                            'nombre': nombre_completo,
                            'empresa': '',
                            'telefono': ''
                        }
                    )

                    # 3. Ubicación y Región
                    comuna_title = nombre1_raw.title()
                    region_deducida = COMUNA_REGION_MAP.get(comuna_title.lower(), 'Metropolitana de Santiago')

                    # 4. Estado
                    estado_final = 'solicitud'
                    if 'Entr.mercancías' in movimiento_raw:
                        estado_final = 'completado'
                    elif 'Stock en tránsito' in movimiento_raw:
                        estado_final = 'rechazado'

                    # 5. Fechas
                    if pd.isnull(fecha_raw):
                        fecha_solicitud = timezone.now()
                    else:
                        fecha_solicitud = pd.to_datetime(fecha_raw)
                    
                    # Fecha despacho aleatoria (3-8 días después)
                    dias_despacho = random.randint(3, 8)
                    fecha_despacho = fecha_solicitud + timedelta(days=dias_despacho)

                    # 6. Logística (Simulación)
                    zona_precio = REGION_ZONA_MAP.get(region_deducida, 'RM')
                    precio_base = ZONA_PRECIOS.get(zona_precio, 4500)
                    
                    opciones_envio = {}
                    courier_keys = list(COURIERS.keys())
                    
                    # Generar opciones
                    for key, data in COURIERS.items():
                        costo = int(precio_base * data['factor'])
                        opciones_envio[key] = costo
                    
                    # Seleccionar uno aleatoriamente
                    selected_courier_key = random.choice(courier_keys)
                    selected_courier_data = COURIERS[selected_courier_key]
                    costo_envio_estimado = opciones_envio[selected_courier_key]

                    # 7. Crear/Obtener Pedido (Agrupado por Doc.mat. si existe)
                    numero_guia = doc_mat_raw if doc_mat_raw and doc_mat_raw != 'nan' else str(uuid.uuid4())
                    
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
                            'fecha_actualizacion': fecha_despacho # Se actualiza al despachar
                        }
                    )
                    
                    if not created:
                        # Si ya existe, actualizamos fecha para mantener consistencia del grupo
                        # Usamos update para evitar auto_now
                        Pedido.objects.filter(id=pedido.id).update(
                            fecha_solicitud=fecha_solicitud,
                            fecha_actualizacion=fecha_despacho,
                            fecha_despacho=fecha_despacho
                        )
                    else:
                        # Si es nuevo, TAMBIÉN forzamos las fechas con update porque auto_now_add/auto_now
                        # ignoran los valores pasados en create/defaults para estos campos.
                        Pedido.objects.filter(id=pedido.id).update(
                            fecha_solicitud=fecha_solicitud,
                            fecha_actualizacion=fecha_despacho,
                            fecha_despacho=fecha_despacho
                        )

                    # 8. Crear Item y Finanzas
                    precio_unitario = importe_val / cantidad_raw if cantidad_raw > 0 else 0
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

                    count_created += 1

                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Error en fila {index}: {e}'))
                    count_skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Proceso completado. Items creados: {count_created}. Errores/Saltados: {count_skipped}'))
