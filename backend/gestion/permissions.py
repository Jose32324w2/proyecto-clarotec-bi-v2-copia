"""
Permisos Personalizados (RBAC).

PROPOSITO:
    Define reglas de acceso granular para las vistas de la API.
    Complementa el sistema de usuarios de Django.

PERMISOS:
    - IsVendedorOrGerencia: Restringe el acceso a empleados autorizados.
"""

from rest_framework import permissions


class IsVendedorOrGerencia(permissions.BasePermission):
    """
    Permiso para Vendedores y Gerencia.
    Usado para: Solicitudes y Cotizaciones
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        rol = request.user.rol.nombre if request.user.rol else None
        return rol in ['Vendedor', 'Gerencia']


class IsAdministrativaOrGerencia(permissions.BasePermission):
    """
    Permiso para Administrativa y Gerencia.
    Usado para: Gestión de Pagos
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        rol = request.user.rol.nombre if request.user.rol else None
        return rol in ['Administrativa', 'Gerencia']


class IsDespachadorOrGerencia(permissions.BasePermission):
    """
    Permiso para Despachador y Gerencia.
    Usado para: Gestión de Despachos
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        rol = request.user.rol.nombre if request.user.rol else None
        return rol in ['Despachador', 'Gerencia']


class IsGerencia(permissions.BasePermission):
    """
    Permiso exclusivo para Gerencia.
    Usado para: BI Dashboard y funciones administrativas
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        rol = request.user.rol.nombre if request.user.rol else None
        return rol == 'Gerencia'


class IsStaffMember(permissions.BasePermission):
    """
    Permiso amplio para staff interno (Vendedor, Administrativa, Gerencia, Despachador).
    Excluye Clientes.
    Usado para: Gestión de Clientes, Vistas generales de administración.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        rol = request.user.rol.nombre if request.user.rol else None
        return rol in ['Vendedor', 'Gerencia', 'Administrativa']
