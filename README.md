# Proyecto Clarotec - Sistema de Gestión de Pedidos y BI

Este proyecto es un sistema integral para la gestión de pedidos, cotizaciones, despachos e **Inteligencia de Negocios (BI)**, desarrollado con **Django (Backend)** y **React (Frontend)**.

## Características Principales

### 📋 Gestión Operativa
*   **Gestión de Solicitudes:** Recepción y administración centralizada de solicitudes.
*   **Cotizaciones:** Creación, edición y envío de cotizaciones formales en PDF.
*   **Historial Completo:** Trazabilidad de cotizaciones (aceptadas, rechazadas, vencidas).
*   **Gestión de Productos:** Catálogo de productos frecuentes con sincronización automática.
*   **Pagos y Despachos:** Flujo completo desde la confirmación del pago hasta el despacho y entrega.
*   **Portal de Clientes:** Interfaz segura para que los clientes revisen y aprueben cotizaciones.

### 📊 Inteligencia de Negocios (BI)
*   **Dashboard Avanzado:** Visualización de KPIs críticos en tiempo real.
*   **Rentabilidad Histórica:** Gráfico de dispersión interactivo para analizar márgenes por pedido.
*   **KPIs Clave:**
    *   Volumen de Ventas (Ingresos y Cantidad).
    *   Margen Operacional Global.
    *   Tasa de Recurrencia de Clientes.
*   **Filtros Dinámicos:** Análisis por rango de fechas, cliente, región y comuna.
*   **Top Productos y Tendencias:** Gráficos de los productos más vendidos y tendencias mensuales de ingresos.

### 🔐 Seguridad y Roles
*   **Autenticación JWT:** Sistema seguro de tokens.
*   **Roles Definidos:** Vendedor, Administrativa, Despachador, Gerencia (con acceso exclusivo a BI).

## Tecnologías Utilizadas

### Backend
*   **Python 3.10+**
*   **Django 5.2** & **Django REST Framework**
*   **MySQL / SQLite** (Configurable)
*   **Pandas & OpenPyXL** (Procesamiento de datos y ETL)
*   **Simple JWT** (Autenticación)
*   **xhtml2pdf** (Generación de PDFs)

### Frontend
*   **React 18**
*   **Vite**
*   **Recharts** (Visualización de datos y gráficos)
*   **Bootstrap 5** (Diseño responsivo)
*   **Axios** (Comunicación API)

## Instalación y Configuración (Desde Cero)

### Prerrequisitos
*   Python 3.10 o superior.
*   Node.js y npm.
*   Git.

### 1. Backend (Django)

1.  Clonar el repositorio y navegar a la carpeta `backend`:
    ```bash
    git clone <url-del-repo>
    cd proyecto-clarotec/backend
    ```

2.  Crear y activar un entorno virtual:
    ```bash
    python -m venv venv
    # Windows:
    venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    ```

3.  Instalar dependencias:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Restaurar Base de Datos (Importante):**
    Para tener el sistema con todos los datos históricos y configuraciones:
    ```bash
    # Crear tablas vacías
    python manage.py migrate

    # Cargar backup completo (Datos históricos + Nuevos)
    python manage.py loaddata data/backup_completo.json
    ```

5.  Crear superusuario (si no venía en el backup o quieres uno nuevo):
    ```bash
    python manage.py createsuperuser
    ```

6.  Iniciar el servidor:
    ```bash
    python manage.py runserver
    ```

### 2. Frontend (React)

1.  Navegar a la carpeta `frontend` (en otra terminal):
    ```bash
    cd ../frontend
    ```

2.  Instalar dependencias:
    ```bash
    npm install
    ```

3.  Iniciar el servidor de desarrollo:
    ```bash
    npm run dev
    ```

## Estructura del Proyecto

### Backend (`backend/gestion`)
*   `models.py`: Modelos de datos (Pedido, Cliente, ItemsPedido, ProductoFrecuente).
*   `views.py`: Lógica de negocio, endpoints API y vistas de BI (`BIDashboardDataView`).
*   `serializers.py`: Serializadores DRF.
*   `management/commands/`: Scripts de utilidad (ej. `import_historical_data.py`).
*   `data/`: Archivos estáticos de datos (`basis.xlsx`, `backup_completo.json`).

### Frontend (`frontend/src`)
*   `pages/panel/`:
    *   `BIPanelPage.jsx`: Dashboard de Inteligencia de Negocios.
    *   `SolicitudesPanelPage.jsx`: Gestión de pedidos.
*   `pages/portal/`: Vista del cliente.
*   `components/`: Componentes UI reutilizables.
*   `hooks/`: Lógica personalizada (ej. `useAuth`).

## Comandos Útiles

### Crear Backup de Base de Datos
Si realizas cambios importantes y quieres guardar el estado actual de la BD:
```bash
python manage.py dumpdata --exclude auth.permission --exclude contenttypes --indent 2 > data/backup_completo.json
```

### Importar Datos Históricos (Excel)
Si necesitas recargar datos desde el Excel original (solo inicial):
```bash
python manage.py import_historical_data
```

---
Desarrollado para Clarotec.