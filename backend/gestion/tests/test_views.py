"""
Módulo de Pruebas de Integración: API de Retención.

Valida la funcionalidad de los endpoints relacionados con la gestión de retención,
incluyendo filtrado y recuperación de estructuras de datos.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from gestion.models import Cliente
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestClientRetentionView:
    def setup_method(self):
        """
        Configuración del entorno: Autenticación administrativa y población de datos iniciales.
        """
        # Inicializa el cliente HTTP simulado (actúa como un navegador o Postman).
        self.client = APIClient()

        # Consulta la base de datos para obtener el rol 'Gerencia'; si no existe, lo crea.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea un usuario en la base de datos de prueba con el rol asignado.
        self.user = User.objects.create_user(
            email='admin@test.com',
            password='password123',
            rol=role
        )

        # Fuerza la autenticación del cliente con este usuario (simula estar logueado).
        self.client.force_authenticate(user=self.user)

        # Crea registros de Clientes de prueba para verificar los listados.
        Cliente.objects.create(nombre="C1", apellido="Test", email="c1@test.com")
        Cliente.objects.create(nombre="C2", apellido="Test", email="c2@test.com")

    def test_get_retention_data(self):
        """
        Prueba de recuperación de datos de retención.
        """
        # Genera la URL relativa para el endpoint 'bi-retention' (ej: /api/bi/retention/).
        url = reverse('bi-retention')

        # Ejecuta una petición HTTP GET a esa URL usando el cliente autenticado.
        response = self.client.get(url)

        # Verifica que el código de estado HTTP sea 200 (OK).
        assert response.status_code == status.HTTP_200_OK

        # Verifica que el cuerpo de la respuesta (JSON) contenga la clave 'summary'.
        assert 'summary' in response.data

        # Verifica que el cuerpo de la respuesta contenga la clave 'clients'.
        assert 'clients' in response.data

        # Verifica que la lista 'clients' contenga exactamente 2 elementos.
        assert len(response.data['clients']) == 2

    def test_search_filter(self):
        """
        Prueba de filtrado por búsqueda de texto.
        """
        # Genera la URL base.
        url = reverse('bi-retention')

        # Ejecuta GET enviado el parámetro de query 'search' (ej: /api/bi/retention/?search=C1).
        response = self.client.get(url, {'search': 'C1'})

        # Verifica que la respuesta sea exitosa (200 OK).
        assert response.status_code == status.HTTP_200_OK

        # Verifica que el filtro haya reducido la lista a 1 solo resultado.
        assert len(response.data['clients']) == 1

        # Verifica que el nombre del cliente retornado coincida con el criterio esperado.
        assert response.data['clients'][0]['nombre'] == "C1 Test"
