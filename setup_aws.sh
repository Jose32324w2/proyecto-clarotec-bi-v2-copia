#!/bin/bash

# ==============================================================================
# SCRIPT DE DESPLIEGUE AUTOMATIZADO - PROYECTO CLAROTEC
# Compatible con: Ubuntu 22.04 LTS / 24.04 LTS (AWS EC2)
# ==============================================================================

# 1. ACTUALIZACIÓN DEL SISTEMA
echo "🔄 Actualizando sistema..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. INSTALACIÓN DE DEPENDENCIAS GLOBALES
echo "📦 Instalando dependencias (Python, Node, Nginx, Git)..."
sudo apt-get install -y python3-pip python3-venv python3-dev libmysqlclient-dev nginx git curl acl

# Instalar Node.js LTS (Versión 18 o 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. CONFIGURACIÓN DEL PROYECTO
# Asumimos que el usuario es 'ubuntu' (default en AWS)
PROJECT_DIR="/home/ubuntu/proyecto-clarotec"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Si el directorio no existe, clonar (Reemplazar URL con tu repo)
if [ ! -d "$PROJECT_DIR" ]; then
    echo "⬇️ Clonando repositorio..."
    # git clone https://github.com/TU_USUARIO/proyecto-clarotec.git $PROJECT_DIR
    echo "⚠️  POR FAVOR CLONA TU REPOSITORIO EN $PROJECT_DIR MANUALMENTE O DESCOMENTA LA LÍNEA DE ARRIBA"
    mkdir -p $PROJECT_DIR
fi

# 4. SETUP BACKEND (DJANGO)
echo "🐍 Configurando Backend..."
cd $BACKEND_DIR

# Crear Entorno Virtual
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activar y Dependencias
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn mysqlclient python-dotenv

# Variables de Entorno (Crear .env si no existe)
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env de ejemplo..."
    cat <<EOT >> .env
DJANGO_SECRET_KEY=cambiar_esta_clave_segura_en_produccion
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=tudominio.com,3.12.34.56,localhost,127.0.0.1
DB_NAME=clarotec_db
DB_USER=root
DB_PASSWORD=tu_password_db
DB_HOST=127.0.0.1
CORS_ALLOWED_ORIGINS=http://tudominio.com,http://3.12.34.56
EOT
fi

# Migraciones y Archivos Estáticos
python manage.py migrate
python manage.py collectstatic --noinput

# 5. CONFIGURACIÓN GUNICORN (SYSTEMD)
echo "🚀 Configurando servicio Gunicorn..."
sudo bash -c "cat > /etc/systemd/system/clarotec_backend.service <<EOF
[Unit]
Description=Gunicorn daemon for Clarotec Backend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:$BACKEND_DIR/clarotec.sock clarotec_api.wsgi:application

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl start clarotec_backend
sudo systemctl enable clarotec_backend

# 6. SETUP FRONTEND (REACT)
echo "⚛️  Construyendo Frontend..."
cd $FRONTEND_DIR

# Crear archivo .env.production
echo "REACT_APP_API_URL=http://tu-ip-publica-o-dominio/api" > .env.production

npm install
npm run build

# 7. CONFIGURACIÓN NGINX
echo "🌐 Configurando Nginx..."
sudo bash -c "cat > /etc/nginx/sites-available/clarotec <<EOF
server {
    listen 80;
    server_name _;  # Acepta cualquier IP/Dominio (Configurar dominio real después)

    # 1. Servir Frontend (React Build)
    location / {
        root $FRONTEND_DIR/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # 2. Proxy para Backend (API)
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:$BACKEND_DIR/clarotec.sock;
    }

    # 3. Archivos Estáticos Backend (Admin)
    location /static/ {
        alias $BACKEND_DIR/staticfiles/;
    }
}
EOF"

# Activar sitio y reiniciar Nginx
sudo ln -sf /etc/nginx/sites-available/clarotec /etc/nginx/sites-enabled
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ ¡DESPLIEGUE FINALIZADO!"
echo "➡️  Asegúrate de configurar los Security Groups en AWS para permitir tráfico HTTP (puerto 80)."
