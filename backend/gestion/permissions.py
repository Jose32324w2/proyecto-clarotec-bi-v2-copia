"""
Permisos Personalizados (RBAC).

PROPOSITO:
    Define reglas de acceso granular para las vistas de la API.
    Complementa el sistema de usuarios de Django.

PERMISOS:
    - IsVendedorOrGerencia: Restringe el acceso a empleados autorizados.
"""

from rest_framework import permissions # Importa el módulo permissions de rest_framework

# Defino la clase IsVendedorOrGerencia que hereda de permissions.BasePermission
class IsVendedorOrGerencia(permissions.BasePermission):
    """
    Permiso para Vendedores y Gerencia.
    Usado para: Solicitudes y Cotizaciones
    """
    # Implementa el método has_permission que recibe el request y la vista
    def has_permission(self, request, view):
        # Si el usuario no está autenticado, no tiene permiso
        if not request.user.is_authenticated:
            return False

        # Obtiene el rol del usuario
        rol = request.user.rol.nombre if request.user.rol else None
        # Devuelve True si el rol es Vendedor o Gerencia
        return rol in ['Vendedor', 'Gerencia']

# Defino la clase IsAdministrativaOrGerencia que hereda de permissions.BasePermission
class IsAdministrativaOrGerencia(permissions.BasePermission):
    """
    Permiso para Administrativa y Gerencia.
    Usado para: Gestión de Pagos
    """
    # Implementa el método has_permission que recibe el request y la vista
    def has_permission(self, request, view):
        # Si el usuario no está autenticado, no tiene permiso
        if not request.user.is_authenticated:
            return False

        # Obtiene el rol del usuario
        rol = request.user.rol.nombre if request.user.rol else None
        # Devuelve True si el rol es Administrativa o Gerencia
        return rol in ['Administrativa', 'Gerencia']

# Defino la clase IsDespachadorOrGerencia que hereda de permissions.BasePermission
class IsDespachadorOrGerencia(permissions.BasePermission):
    """
    Permiso para Despachador y Gerencia.
    Usado para: Gestión de Despachos
    """
    # Implementa el método has_permission que recibe el request y la vista
    def has_permission(self, request, view):
        # Si el usuario no está autenticado, no tiene permiso
        if not request.user.is_authenticated:
            return False

        # Obtiene el rol del usuario
        rol = request.user.rol.nombre if request.user.rol else None
        return rol in ['Despachador', 'Gerencia']

# Defino la clase IsGerencia que hereda de permissions.BasePermission
class IsGerencia(permissions.BasePermission):
    """
    Permiso exclusivo para Gerencia.
    Usado para: BI Dashboard y funciones administrativas
    """
    # Implementa el método has_permission que recibe el request y la vista
    def has_permission(self, request, view):
        # Si el usuario no está autenticado, no tiene permiso
        if not request.user.is_authenticated:
            return False

        # Obtiene el rol del usuario
        rol = request.user.rol.nombre if request.user.rol else None
        # Devuelve True si el rol es Gerencia
        return rol == 'Gerencia'

# Defino la clase IsStaffMember que hereda de permissions.BasePermission
class IsStaffMember(permissions.BasePermission):
    """
    Permiso amplio para staff interno (Vendedor, Administrativa, Gerencia, Despachador).
    Excluye Clientes.
    Usado para: Gestión de Clientes, Vistas generales de administración.
    """
    # Implementa el método has_permission que recibe el request y la vista
    def has_permission(self, request, view):
        # Si el usuario no está autenticado, no tiene permiso
        if not request.user.is_authenticated:
            return False

        # Obtiene el rol del usuario
        rol = request.user.rol.nombre if request.user.rol else None
        # Devuelve True si el rol es Vendedor, Gerencia o Administrativa
        return rol in ['Vendedor', 'Gerencia', 'Administrativa']
