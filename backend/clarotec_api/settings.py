"""
Django settings for clarotec_api project.

PROPOSITO:
    Archivo de configuración principal del proyecto Django.
    Define variables globales como credenciales de BD, aplicaciones instaladas,
    middleware de seguridad, configuración de correo (SMTP) y JWT.

COMPONENTES CLAVE:
    - INSTALLED_APPS: Lista de aplicaciones (gestion, usuarios, corsheaders, etc).
    - DATABASES: Configuración de MySQL (producción/local) o SQLite (pruebas).
    - CORS_ALLOWED_ORIGINS: Dominios permitidos para conectar desde React.
    - EMAIL_BACKEND: Configuración para envío de cotizaciones y alertas.
"""
# Importaciones de librerias
from datetime import timedelta  # Importacion de timedelta para configuracion de JWT
from pathlib import Path  # Importacion de Path para definicion de directorio base
import os  # Importacion de os para variables de entorno

# Definicion de Directorio Base
BASE_DIR = Path(__file__).resolve().parent.parent


# Seguridad: mantener la clave secreta utilizada en producción secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-o&&a**dkxtt+&1i7j37uv2!gtjorpp5a$ju9)$5_v6%bkbg$2s')

# Seguridad: no ejecutar con depuración encendida en producción!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

# Definicion de Hosts
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost,100.25.3.197').split(',')


# Definicion de Aplicaciones
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',

    # Aplicaciones de terceros
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local apps
    'usuarios',
    'gestion',
]

AUTH_USER_MODEL = 'usuarios.User'

# Definicion de Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',  # Seguridad
    'django.contrib.sessions.middleware.SessionMiddleware',  # Sesiones
    'corsheaders.middleware.CorsMiddleware',  # CORS
    'django.middleware.common.CommonMiddleware',  # Middleware común
    'django.middleware.csrf.CsrfViewMiddleware',  # CSRF valida que cada petición POST traiga un token único.
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # Autenticación
    'django.contrib.messages.middleware.MessageMiddleware',  # Mensajes
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # Clickjacking = Secuestro de clics
]

# CONFIGURACIÓN DE URL RAÍZ
ROOT_URLCONF = 'clarotec_api.urls'

# CONFIGURACIÓN DE plantillas
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',  # Motor de plantillas
        'DIRS': [os.path.join(BASE_DIR, 'gestion/templates')],  # Directorio de plantillas
        'APP_DIRS': True,  # Buscar plantillas en aplicaciones
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',  # Procesador de plantillas
                'django.contrib.auth.context_processors.auth',  # Procesador de autenticación
                'django.contrib.messages.context_processors.messages',  # Procesador de mensajes
            ],
        },
    },
]

# CONFIGURACIÓN DE WSGI
WSGI_APPLICATION = 'clarotec_api.wsgi.application'


# CONFIGURACIÓN DE BASE DE DATOS
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',  # Motor de base de datos
        'NAME': os.environ.get('DB_NAME', 'clarotec_db'),  # Nombre de la base de datos
        'USER': os.environ.get('DB_USER', 'root'),  # Usuario de la base de datos
        'PASSWORD': os.environ.get('DB_PASSWORD', 'sxS1s992_sSS'),  # Contraseña de la base de datos
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),  # Host de la base de datos
        'PORT': os.environ.get('DB_PORT', '3306'),  # Puerto de la base de datos
    }
}


# CONFIGURACIÓN DE VALIDACIÓN DE PASSWORD
AUTH_PASSWORD_VALIDATORS = [
    {
        # Validador de similitud de atributos de usuario
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        # Validador de longitud mínima
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        # Validador de contraseñas comunes
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        # Validador de contraseñas numéricas
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        # Guardar contraseñas con algoritmo PBKDF2 + SHA256
        # el sha256 la herramienta que se encarga de hashing de la contraseña
        # el pbkdf2 es el algoritmo que se encarga de gestionar como se aplica el hashing
        'NAME': 'usuarios.validators.CustomComplexPasswordValidator',
    },
]


# CONFIGURACIÓN DE INTERNACIONALIZACIÓN
LANGUAGE_CODE = 'en-us'  # Idioma por defecto

TIME_ZONE = 'UTC'  # Zona horaria

USE_I18N = True  # Internacionalización

USE_TZ = True  # Uso de Zona Horaria


# CONFIGURACIÓN DE ARCHIVOS ESTATICOS (CSS, JavaScript, Imágenes)
STATIC_URL = 'django_static/'  # URL de los archivos estáticos
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Directorio de los archivos estáticos

# CONFIGURACIÓN DE ARCHIVOS ESTATICOS (CSS, JavaScript, Imágenes)
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'  # Campo por defecto


# Configuración de CORS
# CORS protege la API impidiendo que sitios web falsos consuman los datos
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', "http://localhost:3000,http://127.0.0.1:3000").split(',')  # Dominios permitidos

# Configuración de REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (  # Clases de autenticación
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # Clase de autenticación
    ),
}

# Configuración de Simple JWT

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),  # Token de acceso dura 60 minutos
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # Refresh token dura 7 días
    'ROTATE_REFRESH_TOKENS': True,                   # Rotar refresh token en cada uso
    'BLACKLIST_AFTER_ROTATION': True,                # Blacklist del token anterior
    'UPDATE_LAST_LOGIN': True,                       # Actualizar last_login
    'ALGORITHM': 'HS256',                            # Algoritmo de encriptación
    'AUTH_HEADER_TYPES': ('Bearer',),                 # Tipo de autenticación
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),  # Clase del token
}

# Configuración de Email (Gmail SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Backend de correo
EMAIL_HOST = 'smtp.gmail.com'  # Host de correo
EMAIL_PORT = 587  # Puerto de correo
EMAIL_USE_TLS = True  # Uso de TLS
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'correoclarotec@gmail.com')  # Usuario de correo
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'uovd swcs xxkw gchg')  # Contraseña de correo
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER  # Email de origen

# URL del Frontend (Para correos y enlaces)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')  # URL del Frontend
