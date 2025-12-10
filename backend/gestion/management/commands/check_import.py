from django.core.management.base import BaseCommand
from gestion.models import Cliente, Pedido, ItemsPedido


class Command(BaseCommand):
    help = 'Muestra los últimos 5 registros importados para verificación'

    def handle(self, *args, **kwargs):
        with open('import_verification.txt', 'w', encoding='utf-8') as f:
            f.write("=== ÚLTIMOS 5 CLIENTES ===\n")
            for c in Cliente.objects.order_by('-id')[:5]:
                f.write(f"ID: {c.id} | Nombre: {c.nombre} | Email: {c.email}\n")

            f.write("\n=== ÚLTIMOS 5 PEDIDOS ===\n")
            for p in Pedido.objects.order_by('-id')[:5]:
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

            f.write("\n=== ÚLTIMOS 5 ITEMS ===\n")
            for i in ItemsPedido.objects.order_by('-id')[:5]:
                f.write(
                    f"ID: {i.id} | Pedido ID: {i.pedido.id} | Desc: {i.descripcion[:30]}... | Cant: {i.cantidad} | Venta Unit: ${i.precio_unitario} | Costo Unit: ${i.precio_compra} | Subtotal: ${i.subtotal}\n")

        self.stdout.write("Verificación guardada en import_verification.txt")
