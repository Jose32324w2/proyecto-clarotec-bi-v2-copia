"""
Módulo de Pruebas de Seguridad: Control de Acceso Basado en Roles (RBAC).

Verifica que las restricciones de permisos se apliquen correctamente en los
endpoints protegidos, distinguiendo entre roles de Cliente y Administrativos.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestSecurity:
    def setup_method(self):
        """
        Configuración de Entorno: Creación de usuarios con distintos roles.
        """
        # Inicializa cliente HTTP.
        self.client = APIClient()

        # Crea Rol 'Cliente'.
        rol_cliente, _ = Roles.objects.get_or_create(nombre='Cliente')

        # Crea Rol 'Gerencia'.
        rol_gerencia, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea Usuario Cliente.
        self.user_client = User.objects.create_user(email='client@sec.com', password='123', rol=rol_cliente)

        # Crea Usuario Admin.
        self.user_admin = User.objects.create_user(email='admin@sec.com', password='123', rol=rol_gerencia)

    def test_cliente_acceso_denegado_dashboard(self):
        """
        Verifica el Bloqueo de Acceso No Autorizado.
        """
        # Autentica como Cliente.
        self.client.force_authenticate(user=self.user_client)

        # URL del Dashboard de BI (Recurso protegido).
        url = reverse('bi-dashboard-stats')

        # Intenta Acceder (GET).
        response = self.client.get(url)

        # Valida que el código sea 403 Forbidden (Prohibido).
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_acceso_permitido_dashboard(self):
        """
        Verifica el Acceso Autorizado.
        """
        # Autentica como Admin.
        self.client.force_authenticate(user=self.user_admin)

        # URL del mismo dashboard.
        url = reverse('bi-dashboard-stats')

        # Intenta Acceder (GET).
        response = self.client.get(url)

        # Valida que el código sea 200 OK (Permitido).
        assert response.status_code == status.HTTP_200_OK
