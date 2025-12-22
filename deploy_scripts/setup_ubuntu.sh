#!/bin/bash

# setup_ubuntu.sh
# Script para configurar un servidor Ubuntu para Proyecto Clarotec
# Uso: sudo ./setup_ubuntu.sh

# Colores para output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Iniciando Configuración del Servidor Ubuntu ===${NC}"

# VARIABLES (¡CÁMBIALAS SI ES NECESARIO!)
PROJECT_DIR="/var/www/proyecto-clarotec"
REPO_URL="https://github.com/Jose32324w2/proyecto-clarotec-bi-v2-copia.git" # Asumiendo este repo, ajustar si es privado
DB_NAME="clarotec_db"
DB_USER="clarotec_user"
DB_PASS="clarotec_password_segura" # ¡CAMBIAR ESTO!

# 1. Actualizar sistema e instalar dependencias
echo -e "${GREEN}--> Actualizando sistema e instalando dependencias...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv python3-dev libmysqlclient-dev mysql-server nginx git certbot python3-certbot-nginx

# 2. Configurar MySQL
echo -e "${GREEN}--> Configurando MySQL...${NC}"
sudo systemctl start mysql
sudo systemctl enable mysql

# Crear base de datos y usuario (esto es seguro ejecutarlo varias veces, fallará si ya existe pero no romperá nada crítico)
sudo mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 3. Clonar/Actualizar Repositorio
echo -e "${GREEN}--> Configurando código del proyecto...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "El directorio ya existe. Actualizando..."
    cd $PROJECT_DIR
    sudo git pull
else
    echo "Clonando repositorio..."
    sudo git clone $REPO_URL $PROJECT_DIR
fi

# Configurar permisos (el usuario actual será dueño de los archivos para facilitar edicion)
sudo chown -R $USER:www-data $PROJECT_DIR
sudo chmod -R 775 $PROJECT_DIR

# 4. Configurar Backend (Python/Django)
echo -e "${GREEN}--> Configurando Backend...${NC}"
cd $PROJECT_DIR/backend

# Crear entorno virtual
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activar venv e instalar dependencias
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "Creando archivo .env de ejemplo..."
    cat <<EOF > .env
DJANGO_SECRET_KEY='$(openssl rand -base64 50 | tr -d '\n')'
DJANGO_DEBUG=False
ALLOWED_HOSTS='*'
DB_NAME='${DB_NAME}'
DB_USER='${DB_USER}'
DB_PASSWORD='${DB_PASS}'
DB_HOST='localhost'
DB_PORT='3306'
EOF
fi

# Migraciones y estáticos
python manage.py migrate
python manage.py collectstatic --noinput

# 5. Configurar Frontend (React)
echo -e "${GREEN}--> Configurando Frontend...${NC}"
# Necesitamos Node.js para construir el frontend
if ! command -v npm &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

cd $PROJECT_DIR/frontend
npm install
# Crear archivo .env para React
echo "REACT_APP_API_URL=/api" > .env
npm run build

# 6. Configurar Gunicorn (Servidor de Aplicación)
echo -e "${GREEN}--> Configurando Systemd Service para Django...${NC}"
sudo cp $PROJECT_DIR/deploy_scripts/gunicorn_clarotec.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start gunicorn_clarotec
sudo systemctl enable gunicorn_clarotec

# 7. Configurar Nginx (Servidor Web)
echo -e "${GREEN}--> Configurando Nginx...${NC}"
sudo cp $PROJECT_DIR/deploy_scripts/nginx.conf /etc/nginx/sites-available/proyecto_clarotec
sudo ln -nsf /etc/nginx/sites-available/proyecto_clarotec /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 8. Firewall
echo -e "${GREEN}--> Configurando Firewall (UFW)...${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
# Preguntar antes de activar si estamos por SSH remoto
# sudo ufw enable 

echo -e "${GREEN}=== ¡Instalación Completada! ===${NC}"
echo "Ahora configura tu router para redirigir los puertos 80 y 443 a la IP de esta máquina."
