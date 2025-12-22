import os
import sys
import django

# 1. Configurar entorno Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clarotec_api.settings')
django.setup()

from gestion.models import Cliente, Pedido
from django.db.models import ProtectedError

def probar_integridad():
    print("\n🧪 INICIANDO PRUEBA DE INTEGRIDAD DE DATOS (ON_DELETE=PROTECT)\n")
    
    # Pasos de la prueba
    try:
        # A. Crear un Cliente de prueba
        cliente_test = Cliente.objects.create(
            nombre="Cliente", 
            apellido="Prueba Integridad", 
            email="test_integrity@ejemplo.com"
        )
        print(f"✅ 1. Cliente creado: {cliente_test}")

        # B. Crear un Pedido asociado a ese Cliente
        pedido_test = Pedido.objects.create(
            cliente=cliente_test
        )
        print(f"✅ 2. Pedido asociado creado: {pedido_test}")

        # C. Intentar borrar el Cliente (Debería fallar)
        print("⚡ 3. Intentando borrar el Cliente (¡Debería fallar!)...")
        cliente_test.delete()
        
        # Si llegamos aquí, falló la protección
        print("❌ FALLO: El cliente fue borrado. La protección NO funcionó.")
    
    except ProtectedError:
        # Si entra aquí, es un ÉXITO
        print("\n🛡️  ¡ÉXITO TOTAL! La base de datos BLOQUEÓ el borrado.")
        print("   Explicación: No puedes borrar un Cliente que tiene Pedidos activos.")
        print("   Esto demuestra que la Integridad Referencial funciona.")
        
    except Exception as e:
        print(f"⚠️ Error inesperado: {e}")

    finally:
        # Limpieza (Borrar manual para no dejar basura)
        print("\n🧹 Limpiando datos de prueba...")
        if 'pedido_test' in locals():
            pedido_test.delete() # Borramos el hijo primero
        if 'cliente_test' in locals():
            cliente_test.delete() # Ahora sí podemos borrar el padre
        print("✅ Datos de prueba eliminados.")

if __name__ == '__main__':
    probar_integridad()
