import pandas as pd
import uuid
import os
import json
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from gestion.models import Cliente, Pedido, ItemsPedido
from gestion.services import ShippingCalculator

class Command(BaseCommand):
    help = 'Importa datos históricos desde basis.xlsx con lógica de negocio específica'

    def handle(self, *args, **kwargs):
        file_path = 'backend/data/basis.xlsx'
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'Archivo no encontrado: {file_path}'))
            return

        self.stdout.write(f'Leyendo archivo: {file_path}...')
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error leyendo Excel: {e}'))
            return

        # Mapa de Regiones (Hardcoded para evitar dependencia circular o lectura de archivo JS complejo)
        # Basado en locations.js
        COMUNA_REGION_MAP = {}
        REGIONES_DATA = [
            {"region": "Arica y Parinacota", "comunas": ["Arica", "Putre", "General Lagos", "Camarones"]},
            {"region": "Tarapacá", "comunas": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara"]},
            {"region": "Antofagasta", "comunas": ["Antofagasta", "Calama", "San Pedro de Atacama", "Taltal", "Tocopilla"]},
            {"region": "Atacama", "comunas": ["Copiapó", "Vallenar", "Caldera", "Chañaral", "Diego de Almagro"]},
            {"region": "Coquimbo", "comunas": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Andacollo"]},
            {"region": "Valparaíso", "comunas": ["Valparaíso", "Viña del Mar", "San Antonio", "Quillota", "La Ligua"]},
            {"region": "Metropolitana de Santiago", "comunas": ["Santiago", "Puente Alto", "Maipú", "San Bernardo", "Estación Central"]},
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

        # Aplanar mapa para búsqueda rápida
        for item in REGIONES_DATA:
            for comuna in item['comunas']:
                COMUNA_REGION_MAP[comuna.lower()] = item['region']

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
                    importe_raw = str(row.get('Importe ML', '0')).replace(',', '').replace('.', '') # Limpiar formato moneda
                    
                    # Manejo de importe (puede venir como string con comas o float)
                    try:
                        importe_val = float(importe_raw) if isinstance(row.get('Importe ML'), str) else float(row.get('Importe ML', 0))
                    except:
                        importe_val = 0.0

                    # 2. Lógica de Cliente (Deducción)
                    if not usuario_raw or usuario_raw == 'nan':
                        usuario_raw = 'GENERICO'
                    
                    email_gen = f"{usuario_raw}@gmail.com".lower()
                    
                    # Nombre: Primera letra + Resto
                    if len(usuario_raw) > 1:
                        first_letter = usuario_raw[0].upper()
                        rest = usuario_raw[1:].title()
                        # Mapeo simple de nombres comunes
                        nombres_map = {'I': 'Ivan', 'P': 'Pedro', 'J': 'Juan', 'C': 'Carlos', 'A': 'Ana', 'M': 'Maria'}
                        nombre_pila = nombres_map.get(first_letter, first_letter)
                        nombre_completo = f"{nombre_pila} {rest}"
                    else:
                        nombre_completo = usuario_raw

                    cliente, _ = Cliente.objects.get_or_create(
                        email=email_gen,
                        defaults={
                            'nombre': nombre_completo,
                            'empresa': '', # Opcional vacío
                            'telefono': ''
                        }
                    )

                    # 3. Lógica de Ubicación (Normalización)
                    comuna_title = nombre1_raw.title()
                    region_deducida = COMUNA_REGION_MAP.get(comuna_title.lower(), 'Metropolitana de Santiago') # Default RM

                    # 4. Lógica de Estado
                    estado_final = 'solicitud'
                    if 'Entr.mercancías' in movimiento_raw:
                        estado_final = 'completado'
                    elif 'Stock en tránsito' in movimiento_raw:
                        estado_final = 'rechazado'

                    # 5. Lógica de Fechas
                    if pd.isnull(fecha_raw):
                        fecha_solicitud = timezone.now()
                    else:
                        fecha_solicitud = pd.to_datetime(fecha_raw)

                    # 6. Crear Pedido (Idempotencia básica: evitar duplicados exactos de fecha+cliente+total)
                    # Nota: Para este script simplificado, crearemos uno nuevo por cada fila si no existe ID externo claro.
                    # Si quisiéramos agrupar items en un pedido, necesitaríamos un ID de agrupación en el Excel.
                    # Asumiremos 1 Fila = 1 Pedido para simplificar la historia, o podríamos agrupar por 'Doc.mat.' si existe.
                    
                    # Usaremos 'Doc.mat.' como agrupador si existe, sino creamos uno nuevo.
                    doc_mat = str(row.get('Doc.mat.', uuid.uuid4()))
                    
                    pedido, created = Pedido.objects.get_or_create(
                        numero_guia=doc_mat, # Usamos numero_guia temporalmente para guardar la referencia externa y agrupar
                        defaults={
                            'cliente': cliente,
                            'fecha_solicitud': fecha_solicitud,
                            'estado': estado_final,
                            'region': region_deducida,
                            'comuna': comuna_title,
                            'costo_envio_estimado': 0,
                            'porcentaje_urgencia': 0,
                            'id_seguimiento': uuid.uuid4()
                        }
                    )
                    
                    # Si el pedido ya existía (agrupación), actualizamos fecha para asegurar consistencia
                    if not created:
                        pedido.fecha_actualizacion = timezone.now()
                        pedido.save()

                    # 7. Crear Item y Finanzas
                    precio_unitario = importe_val / cantidad_raw if cantidad_raw > 0 else 0
                    precio_compra = precio_unitario * 0.7 # Margen teórico 30%

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
