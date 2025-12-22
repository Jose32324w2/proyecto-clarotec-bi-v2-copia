from django.apps import AppConfig # Importa la clase AppConfig de Django


class GestionConfig(AppConfig): # Define la configuración de la aplicación gestion
    default_auto_field = 'django.db.models.BigAutoField' # Define el campo por defecto de la aplicación
    name = 'gestion' # Define el nombre de la aplicación
