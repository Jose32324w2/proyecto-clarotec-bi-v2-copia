
class MetricasKPIView(APIView):
    """
    Endpoint para obtener KPIs de BI: Tasa de Recurrencia y Margen Operacional.
    """
    permission_classes = [IsGerencia]

    def get(self, request):
        # 1. Filtros Base (Mismos que RentabilidadHistorica)
        # Usamos 'completado' para métricas finales, pero para margen podríamos considerar otros estados si se requiere.
        # Por consistencia con rentabilidad, usamos 'completado'.
        pedidos = Pedido.objects.filter(estado='completado')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        cliente_id = request.query_params.get('cliente_id')
        region = request.query_params.get('region')

        if start_date:
            pedidos = pedidos.filter(fecha_actualizacion__date__gte=start_date)
        if end_date:
            pedidos = pedidos.filter(fecha_actualizacion__date__lte=end_date)
        if cliente_id:
            pedidos = pedidos.filter(cliente_id=cliente_id)
        if region:
            pedidos = pedidos.filter(region=region)

        # --- KPI 1: Tasa de Recurrencia ---
        # Lógica: De los clientes que aparecen en los pedidos filtrados, ¿cuántos son recurrentes (históricamente > 1 compra)?
        
        # Obtener IDs de clientes en el set filtrado
        clientes_en_periodo_ids = pedidos.values_list('cliente_id', flat=True).distinct()
        total_clientes_periodo = len(clientes_en_periodo_ids)
        
        clientes_recurrentes_count = 0
        clientes_nuevos_count = 0
        
        if total_clientes_periodo > 0:
            # Consultar historial completo de estos clientes
            # Anotamos cada cliente con su conteo total de pedidos completados históricos
            clientes_stats = Pedido.objects.filter(
                cliente_id__in=clientes_en_periodo_ids, 
                estado='completado'
            ).values('cliente').annotate(total_historico=Count('id'))
            
            for stat in clientes_stats:
                if stat['total_historico'] > 1:
                    clientes_recurrentes_count += 1
                else:
                    clientes_nuevos_count += 1
            
            tasa_recurrencia = (clientes_recurrentes_count / total_clientes_periodo) * 100
        else:
            tasa_recurrencia = 0

        # --- KPI 2: Margen Operacional Global ---
        # Lógica: Sumar (Ingresos - Costos) / Ingresos de todos los pedidos filtrados.
        # Reutilizamos lógica de cálculo iterativo por simplicidad y consistencia con RentabilidadHistoricaView
        # (Aunque podría optimizarse con agregaciones complejas, el cálculo de urgencia lo hace difícil en DB pura sin funciones complejas)
        
        total_ingresos_global = Decimal('0.00')
        total_costos_global = Decimal('0.00')
        
        # Iteramos sobre el queryset filtrado 'pedidos' (que ya tiene prefetch de items idealmente, pero aquí no lo forzamos por ahora)
        # Para optimizar, hacemos prefetch
        pedidos_con_items = pedidos.prefetch_related('items')
        
        for p in pedidos_con_items:
            # Sumar items
            subtotal_pedido = Decimal('0.00')
            costo_pedido = Decimal('0.00')
            
            for item in p.items.all():
                subtotal_pedido += item.subtotal
                costo_pedido += (item.precio_compra * item.cantidad)
            
            # Aplicar urgencia al ingreso
            recargo = subtotal_pedido * (p.porcentaje_urgencia / Decimal('100'))
            ingreso_neto_pedido = subtotal_pedido + recargo
            
            total_ingresos_global += ingreso_neto_pedido
            total_costos_global += costo_pedido

        margen_operacional_global = 0
        if total_ingresos_global > 0:
            utilidad_global = total_ingresos_global - total_costos_global
            margen_operacional_global = (utilidad_global / total_ingresos_global) * 100

        return Response({
            'tasa_recurrencia': round(tasa_recurrencia, 1),
            'clientes_nuevos': clientes_nuevos_count,
            'clientes_recurrentes': clientes_recurrentes_count,
            'margen_operacional': round(float(margen_operacional_global), 1),
            'total_ingresos': float(total_ingresos_global),
            'total_utilidad': float(total_ingresos_global - total_costos_global)
        }, status=status.HTTP_200_OK)
