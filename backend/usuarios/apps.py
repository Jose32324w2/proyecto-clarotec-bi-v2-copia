from django.apps import AppConfig # Importa AppConfig


class UsuariosConfig(AppConfig): # Clase UsuariosConfig
    default_auto_field = 'django.db.models.BigAutoField' #  AutoField para la clave primaria
    name = 'usuarios' # Nombre de la app
