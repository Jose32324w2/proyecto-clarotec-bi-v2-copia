"""
Script de diagnóstico para probar la creación de ItemsPedido
Ejecutar con: py manage.py shell < test_items_creation.py
"""

from gestion.models import Cliente, Pedido, ItemsPedido
from django.db import transaction

print("=== INICIO TEST CREACIÓN ITEMS ===")

# Simular datos de una solicitud
cliente_data = {
    'nombre': 'Test Cliente Debug',
    'email': 'testdebug@gmail.com',
    'empresa': '',
    'telefono': ''
}

items_data = [
    {
        'tipo': 'MANUAL',
        'descripcion': 'Producto Test 1',
        'cantidad': 2,
        'referencia': 'REF001',
        'producto_id': None
    },
    {
        'tipo': 'MANUAL',
        'descripcion': 'Producto Test 2',
        'cantidad': 3,
        'referencia': 'REF002',
        'producto_id': None
    }
]

try:
    with transaction.atomic():
        print("1. Creando cliente...")
        cliente, created = Cliente.objects.get_or_create(
            email=cliente_data['email'],
            defaults={
                'nombre': cliente_data['nombre'],
                'empresa': cliente_data.get('empresa', ''),
                'telefono': cliente_data.get('telefono', '')
            }
        )
        print(f"   Cliente: {cliente.id} (Creado: {created})")
        
        print("2. Creando pedido...")
        pedido = Pedido.objects.create(
            cliente=cliente,
            region='Test Region',
            comuna='Test Comuna'
        )
        print(f"   Pedido: {pedido.id}")
        
        print("3. Creando items...")
        for idx, item_data in enumerate(items_data):
            print(f"   3.{idx+1}. Creando item: {item_data['descripcion']}")
            item = ItemsPedido.objects.create(
                pedido=pedido,
                descripcion=item_data['descripcion'],
                cantidad=item_data['cantidad'],
                tipo_origen=item_data['tipo'],
                referencia=item_data.get('referencia', ''),
                producto_frecuente=None
            )
            print(f"        Item creado: {item.id}")
        
        print("4. Verificando items guardados...")
        items_count = ItemsPedido.objects.filter(pedido=pedido).count()
        print(f"   Total items para pedido {pedido.id}: {items_count}")
        
        print("✅ TRANSACCIÓN COMPLETADA")
        
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print("=== FIN TEST ===")
