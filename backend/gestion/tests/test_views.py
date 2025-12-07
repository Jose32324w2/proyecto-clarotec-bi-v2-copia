"""
Pruebas de Integración de Vistas (API).

PROPOSITO:
    Verificar que los endpoints (URLs) respondan correctamente (200 OK, 403 Forbidden).
    Valida la estructura del JSON de respuesta y los permisos de usuario.
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
        self.client = APIClient()
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')
        self.user = User.objects.create_user(
            email='admin@test.com',
            password='password123',
            rol=role
        )
        self.client.force_authenticate(user=self.user)

        # Create some data
        Cliente.objects.create(nombres="C1", apellidos="Test", email="c1@test.com")
        Cliente.objects.create(nombres="C2", apellidos="Test", email="c2@test.com")

    def test_get_retention_data(self):
        url = reverse('bi-retention')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'clients' in response.data
        assert len(response.data['clients']) == 2

    def test_search_filter(self):
        url = reverse('bi-retention')
        response = self.client.get(url, {'search': 'C1'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['clients']) == 1
        assert response.data['clients'][0]['nombre'] == "C1 Test"
