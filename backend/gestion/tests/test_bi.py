"""
Módulo de Pruebas: Estructura de APIs BI (Business Intelligence).

Verifica la estructura de datos retornada por los endpoints de KPI, asegurando
que el frontend reciba las métricas clave esperadas.
"""
import pytest # Importa el framework de pruebas
from rest_framework.test import APIClient # Importa el cliente de pruebas de Django Rest Framework
from rest_framework import status # Importa los códigos de estado HTTP
from django.urls import reverse # Importa la función para resolver URLs
from gestion.models import Pedido # Importa el modelo de Pedido
from usuarios.models import User, Roles # Importa los modelos de User y Roles


@pytest.mark.django_db # Marca la clase para que se ejecute con la base de datos de pruebas
class TestBI:
    # Método de inicialización de datos de prueba
    def setup_method(self):
        # Inicia el cliente de pruebas API. 
        self.client = APIClient()

        # Asegura que exista el rol 'Gerencia'.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea un usuario con dicho rol para tener acceso a los reportes.
        self.user = User.objects.create_user(email='bi@test.com', password='123', rol=role)

        # Autentica la sesión de pruebas con este usuario.
        self.client.force_authenticate(user=self.user)

    # Prueba la estructura de la respuesta del endpoint de KPIs
    def test_kpi_metrics_structure(self):
        """
        Valida el esquema de respuesta del endpoint de KPIs.
        """
        # Obtiene la URL para Métricas KPI.
        url = reverse('bi-kpis')

        # Ejecuta la petición GET.
        response = self.client.get(url)

        # Verifica código 200 (Éxito).
        assert response.status_code == status.HTTP_200_OK

        # Guarda los datos JSON de respuesta en una variable.
        data = response.data

        # Verifica que el campo 'margen_operacional' exista en el JSON.
        assert 'margen_operacional' in data

        # Verifica que el campo 'tasa_recurrencia' exista.
        assert 'tasa_recurrencia' in data

        # Verifica que el campo 'total_ingresos' exista.
        assert 'total_ingresos' in data

        # Verifica que el campo 'total_utilidad' exista.
        assert 'total_utilidad' in data

    # Prueba comportamiento ante BD vacía
    def test_kpi_empty_db(self):
        """
        Prueba comportamiento ante BD vacía.
        """
        # Borra TODOS los registros de Pedidos de la base de datos de prueba.
        # Esto simula un sistema recién instalado.
        Pedido.objects.all().delete()

        # Obtiene la URL para Métricas KPI.
        url = reverse('bi-kpis')

        # Intenta obtener KPIs sin datos.
        response = self.client.get(url)

        # Se espera un código 200, NO un error 500. El sistema debe manejar la falta de datos.
        assert response.status_code == status.HTTP_200_OK

        # Verifica que el total de ingresos reportado sea 0 (y no null o error).
        assert response.data['total_ingresos'] == 0
