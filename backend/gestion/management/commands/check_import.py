from django.core.management.base import BaseCommand # Importa la clase BaseCommand
from gestion.models import Cliente, Pedido, ItemsPedido # Importa los modelos

# Clase que hereda de BaseCommand que define el comando check_import 
class Command(BaseCommand):
    help = 'Muestra los últimos 5 registros importados para verificación'

    # Método principal que se ejecuta cuando se llama al comando
    def handle(self, *args, **kwargs):
        # Abre el archivo con codificación UTF-8
        # 'w' es para escritura, 'utf-8' es para codificación
        # 'with' es para cerrar el archivo automáticamente
        # 'encoding' es para codificación
        # 'as f' es para asignar el archivo a una variable
        # 'open' es para abrir el archivo
        with open('import_verification.txt', 'w', encoding='utf-8') as f:
            # Escribe los últimos 5 clientes
            f.write("=== ÚLTIMOS 5 CLIENTES ===\n")
            # Recorre los últimos 5 clientes
            for c in Cliente.objects.order_by('-id')[:5]:
                # Escribe el cliente
                f.write(f"ID: {c.id} | Nombre: {c.nombre} | Email: {c.email}\n")

            # Escribe los últimos 5 pedidos
            f.write("\n=== ÚLTIMOS 5 PEDIDOS ===\n")
            # Recorre los últimos 5 pedidos
            for p in Pedido.objects.order_by('-id')[:5]:
                # Escribe el pedido
                f.write( 
                    f"ID: {
                        p.id} | Cliente: {
                        p.cliente.nombre} | Estado: {
                        p.estado} | Solicitud: {
                        p.fecha_solicitud.date()} | Despacho: {
                        p.fecha_despacho.date() if p.fecha_despacho else 'None'} | Región: {
                            p.region} | Comuna: {
                                p.comuna} | Transporte: {
                                    p.transportista} (${
                                        p.costo_envio_estimado})\n")

            # Escribe los últimos 5 items
            f.write("\n=== ÚLTIMOS 5 ITEMS ===\n")
            # Recorre los últimos 5 items
            for i in ItemsPedido.objects.order_by('-id')[:5]:
                # Escribe el item
                f.write( 
                    f"ID: {i.id} | Pedido ID: {i.pedido.id} | Desc: {i.descripcion[:30]}... | Cant: {i.cantidad} | Venta Unit: ${i.precio_unitario} | Costo Unit: ${i.precio_compra} | Subtotal: ${i.subtotal}\n")

            # Escribe el mensaje de éxito
            self.stdout.write("Verificación guardada en import_verification.txt")
