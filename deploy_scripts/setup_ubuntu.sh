#!/bin/bash

# setup_ubuntu.sh
# Script para configurar un servidor Ubuntu/Zorin OS para Proyecto Clarotec
# Uso: cd deploy_scripts && sudo ./setup_ubuntu.sh

# Colores para output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Iniciando Configuración del Servidor (Zorin/Ubuntu) ===${NC}"

# VARIABLES
TARGET_DIR="/var/www/proyecto-clarotec"
DB_NAME="clarotec_db"
DB_USER="clarotec_user"
DB_PASS="clarotec_password_segura" # ¡CAMBIAR ESTO!

# 0. Detectar origen de archivos
# Asumimos que el script se ejecuta desde deploy_scripts/ o la raiz del proyecto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")" # Subir un nivel para encontrar la raiz del proyecto

echo "Directorio del script: $SCRIPT_DIR"
echo "Raíz del proyecto origen: $SOURCE_DIR"

if [ ! -d "$SOURCE_DIR/backend" ]; then
    echo "ERROR: No parece que estés ejecutando esto desde dentro de la carpeta del proyecto."
    echo "Por favor, sitúate en la carpeta deploy_scripts y ejecuta: sudo ./setup_ubuntu.sh"
    exit 1
fi

# 1. Actualizar sistema e instalar dependencias
echo -e "${GREEN}--> Actualizando sistema e instalando dependencias...${NC}"
sudo apt update
# sudo apt upgrade -y # Comentado para ahorrar tiempo, descomentar si se desea
sudo apt install -y python3-pip python3-venv python3-dev libmysqlclient-dev mysql-server nginx git certbot python3-certbot-nginx pkg-config libcairo2-dev libpango-1.0-0 libpangoft2-1.0-0 libjpeg-dev zlib1g-dev

# 2. Configurar MySQL
echo -e "${GREEN}--> Configurando MySQL...${NC}"
sudo systemctl start mysql
sudo systemctl enable mysql

sudo mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 3. Copiar Archivos al directorio final (/var/www)
echo -e "${GREEN}--> Instalando archivos en ${TARGET_DIR}...${NC}"

# Crear directorio destino si no existe
sudo mkdir -p $TARGET_DIR

# Copiar contenido (usamos rsync si existe o cp)
# Excluimos venv, node_modules, .git para una copia limpia
echo "Copiando archivos..."
sudo rsync -av --exclude='venv' --exclude='node_modules' --exclude='.git' --exclude='__pycache__' --exclude='.env' "$SOURCE_DIR/" "$TARGET_DIR/"

# Ajustar permisos
echo "Ajustando permisos..."
sudo chown -R $USER:www-data $TARGET_DIR
sudo chmod -R 775 $TARGET_DIR

# 4. Configurar Backend (Python/Django)
echo -e "${GREEN}--> Configurando Backend...${NC}"
cd $TARGET_DIR/backend

if [ ! -f "venv/bin/activate" ]; then
    echo "Creando virtualenv..."
    rm -rf venv
    python3 -m venv venv
fi

source venv/bin/activate
echo "Instalando requerimientos Python..."
pip install -r requirements.txt
pip install gunicorn

# Eliminar .env antiguo para asegurar credenciales correctas
if [ -f ".env" ]; then
    rm .env
fi

# Crear .env
if [ ! -f ".env" ]; then
    echo "Creando .env..."
    cat <<EOF > .env
DJANGO_SECRET_KEY='$(openssl rand -base64 50 | tr -d '\n')'
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS='*'
DB_NAME='${DB_NAME}'
DB_USER='${DB_USER}'
DB_PASSWORD='${DB_PASS}'
DB_HOST='localhost'
DB_PORT='3306'
EOF
fi

# Cargar variables de entorno para que manage.py las vea
set -a
source .env
set +a

python3 manage.py migrate
python3 manage.py collectstatic --noinput

# 5. Configurar Frontend (React)
echo -e "${GREEN}--> Configurando Frontend...${NC}"
# Instalar Node versión reciente si es muy vieja (opcional, apt install nodejs suele bastar para build basico)
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs

cd $TARGET_DIR/frontend
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias Node..."
    npm install
fi

echo "REACT_APP_API_URL=/api" > .env
npm run build

# 6. Configurar Gunicorn Service
echo -e "${GREEN}--> Configurando Servicio Gunicorn...${NC}"
# Aseguramos que el usuario en el servicio sea el correcto (reemplazamos 'ubuntu' por el usuario actual o root si se prefiere)
# Sed para reemplazar 'User=ubuntu' por "User=$USER" en el archivo .service antes de copiarlo
sudo sed -i "s/User=ubuntu/User=$USER/g" $TARGET_DIR/deploy_scripts/gunicorn_clarotec.service

sudo cp $TARGET_DIR/deploy_scripts/gunicorn_clarotec.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart gunicorn_clarotec
sudo systemctl enable gunicorn_clarotec

# 7. Configurar Nginx
echo -e "${GREEN}--> Configurando Nginx...${NC}"
sudo cp $TARGET_DIR/deploy_scripts/nginx.conf /etc/nginx/sites-available/proyecto_clarotec
sudo ln -nsf /etc/nginx/sites-available/proyecto_clarotec /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 8. Firewall (UFW)
echo -e "${GREEN}--> Configurando Firewall...${NC}"
# En Zorin/Ubuntu desktop a veces ufw está inactivo, lo activamos para permitir web
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
# sudo ufw enable # Descomentar si se quiere forzar activación

echo -e "${GREEN}=== ¡Instalación Completada en Zorin OS! ===${NC}"
echo "Tu proyecto está corriendo en http://localhost o en la IP de esta máquina."
