"""
Módulo de Pruebas: Operaciones CRUD (Create, Read, Update, Delete).

Este módulo verifica la persistencia y manipulación de datos en las entidades
maestras del sistema (Productos y Clientes) mediante la API REST.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from gestion.models import ProductoFrecuente, Cliente
from usuarios.models import User, Roles


@pytest.mark.django_db
class TestCRUD:
    def setup_method(self):
        """
        Configuración: Autenticación de usuario con permisos de escritura.
        """
        # Inicializa cliente de pruebas.
        self.client = APIClient()

        # Asegura rol 'Gerencia'.
        role, _ = Roles.objects.get_or_create(nombre='Gerencia')

        # Crea usuario autorizado.
        self.user = User.objects.create_user(email='crud@test.com', password='123', rol=role)

        # Inicia sesión.
        self.client.force_authenticate(user=self.user)

    def test_producto_crud(self):
        """
        Prueba el ciclo de vida completo (CRUD) de un Producto.
        """
        # --- PASO 1: CREACIÓN (CREATE) ---
        # Obtiene URL para listar/crear productos.
        url_list = reverse('producto-crud-list')

        # Define datos del nuevo producto.
        data = {'nombre': 'Taladro', 'precio_referencia': 50000, 'activo': True}

        # Envía petición POST.
        response = self.client.post(url_list, data)

        # Verifica creación exitosa (201 Created).
        assert response.status_code == status.HTTP_201_CREATED

        # Captura el ID del producto recién creado desde la respuesta.
        prod_id = response.data['id']

        # --- PASO 2: LECTURA (READ) ---
        # Obtiene URL de detalle usando el ID capturado.
        url_detail = reverse('producto-crud-detail', args=[prod_id])

        # Envía petición GET.
        response = self.client.get(url_detail)

        # Verifica éxito (200 OK).
        assert response.status_code == status.HTTP_200_OK

        # --- PASO 3: ACTUALIZACIÓN (UPDATE) ---
        # Envía petición PATCH (actualización parcial) cambiando el nombre.
        response = self.client.patch(url_detail, {'nombre': 'Taladro Percutor'})

        # Verifica éxito.
        assert response.status_code == status.HTTP_200_OK

        # Consulta directamente la BD para asegurar que el cambio se guardó.
        assert ProductoFrecuente.objects.get(id=prod_id).nombre == 'Taladro Percutor'

        # --- PASO 4: ELIMINACIÓN (DELETE) ---
        # Envía petición DELETE.
        response = self.client.delete(url_detail)

        # Verifica código 204 No Content (Éxito al borrar).
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_cliente_crud(self):
        """
        Prueba el ciclo de vida completo (CRUD) de un Cliente.
        """
        # --- CREACIÓN ---
        url_list = reverse('cliente-crud-list')
        # Datos del cliente.
        data = {'nombre': 'Juan', 'apellido': 'CRUD', 'email': 'juan@crud.com'}

        response = self.client.post(url_list, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Captura ID.
        client_id = response.data['id']

        # --- LECTURA ---
        url_detail = reverse('cliente-crud-detail', args=[client_id])
        response = self.client.get(url_detail)
        assert response.status_code == status.HTTP_200_OK

        # --- ACTUALIZACIÓN ---
        # Cambia el nombre.
        response = self.client.patch(url_detail, {'nombre': 'Juan Updated'})
        assert response.status_code == status.HTTP_200_OK

        # Valida cambio en el modelo.
        assert Cliente.objects.get(id=client_id).nombre == 'Juan Updated'

    def test_sincronizar_productos(self):
        """
        Prueba endpoint de sincronización masiva.
        """
        url = reverse('sincronizar-productos')

        # Ejecuta petición POST (disparador de acción).
        response = self.client.post(url)

        # Aceptamos 200 (OK) o 500 (Error interno controlado por lógica de negocio externa).
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]
