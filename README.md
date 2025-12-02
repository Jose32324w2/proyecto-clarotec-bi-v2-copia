# Proyecto Clarotec - Sistema de Gestión de Pedidos

Este proyecto es un sistema integral para la gestión de pedidos, cotizaciones y despachos, desarrollado con **Django (Backend)** y **React (Frontend)**.

## Características Principales

*   **Gestión de Solicitudes:** Recepción y administración de solicitudes de clientes.
*   **Cotizaciones:** Creación, edición y envío de cotizaciones en PDF.
*   **Historial de Cotizaciones:** Visualización de cotizaciones pasadas (aceptadas, rechazadas, etc.).
*   **Gestión de Productos:** Catálogo de productos frecuentes con sincronización automática desde pedidos históricos.
*   **Pagos:** Registro y confirmación de pagos.
*   **Despachos:** Gestión logística, asignación de transportistas y seguimiento.
*   **Portal de Clientes:** Interfaz para que los clientes revisen, acepten o rechacen cotizaciones.
*   **Roles y Permisos:** Sistema de acceso basado en roles (Vendedor, Administrativa, Despachador, Gerencia).

## Tecnologías Utilizadas

### Backend
*   **Python 3.10+**
*   **Django 5.1** & **Django REST Framework**
*   **SQLite** (Base de datos por defecto)
*   **Simple JWT** (Autenticación)
*   **xhtml2pdf** (Generación de PDFs)

### Frontend
*   **React 18**
*   **Vite**
*   **Bootstrap 5** (Estilos)
*   **Axios** (Peticiones HTTP)
*   **React Router DOM** (Navegación)

## Instalación y Configuración

### Prerrequisitos
*   Python instalado.
*   Node.js y npm instalados.

### Backend (Django)

1.  Navegar a la carpeta `backend`:
    ```bash
    cd backend
    ```
2.  Crear un entorno virtual e instalar dependencias:
    ```bash
    python -m venv venv
    source venv/bin/activate  # En Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  Aplicar migraciones:
    ```bash
    python manage.py migrate
    ```
4.  Crear superusuario (opcional):
    ```bash
    python manage.py createsuperuser
    ```
5.  Iniciar el servidor:
    ```bash
    python manage.py runserver
    ```

### Frontend (React)

1.  Navegar a la carpeta `frontend`:
    ```bash
    cd frontend
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
*   `models.py`: Definición de modelos (Pedido, Cliente, ProductoFrecuente, ItemsPedido).
*   `views.py`: Lógica de negocio y endpoints de la API.
*   `serializers.py`: Transformación de datos para la API.
*   `urls.py`: Rutas de la API.
*   `permissions.py`: Permisos personalizados por rol.

### Frontend (`frontend/src`)
*   `pages/panel/`: Vistas del panel administrativo (Dashboard, Cotizaciones, Pagos, Despachos).
*   `pages/portal/`: Vistas del portal de clientes.
*   `components/`: Componentes reutilizables (CurrencyInput, Navbar, Sidebar).
*   `context/`: Contexto de autenticación (AuthContext).

## Uso del Sistema

1.  **Login:** Acceder con credenciales de usuario.
2.  **Dashboard:** Vista general de métricas y accesos rápidos.
3.  **Solicitudes:** Revisar nuevas solicitudes y crear cotizaciones.
4.  **Cotizaciones:** Editar precios, agregar items, calcular envíos y generar PDFs.
5.  **Productos:** Administrar el catálogo o sincronizar productos desde pedidos anteriores.
6.  **Pagos/Despachos:** Gestionar el flujo final del pedido.

---
Desarrollado para Clarotec.