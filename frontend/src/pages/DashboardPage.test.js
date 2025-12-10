/*
Módulo de Pruebas Unitarias Frontend: DashboardPage (Panel Principal).

Verifica el Control de Acceso Basado en Roles (RBAC) en la interfaz de usuario.
Asegura que cada tipo de usuario (Gerencia vs Cliente) vea SOLO las secciones permitidas.
*/
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/*
  MOCK DE AUTH:
  Esencial para probar distintos roles. Definimos una implementación base vacía
  que sobreescribiremos en cada test.
*/
jest.mock('../hooks/useAuth', () => ({
    useAuth: jest.fn()
}));

// Mock de navegación para verificar logout
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

describe('DashboardPage Component (RBAC)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders full menu for Gerencia (Admin)', () => {
        /*
          Escenario: Usuario Gerente inicia sesión.
          Debe ver todas las opciones administrativas (Solicitudes, Cotizaciones, Pagos, Despachos, Clientes).
        */
        useAuth.mockReturnValue({
            user: {
                first_name: 'Jefe',
                email: 'jefe@test.com',
                rol: { nombre: 'Gerencia' }
            },
            logout: jest.fn()
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        // Verificamos presencia de tarjetas clave usando Role Heading para evitar conflictos con textos de botones.
        expect(screen.getByRole('heading', { name: /Gestión de Pedidos/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Solicitudes$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Cotizaciones$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Pagos$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Despachos$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Clientes$/i })).toBeInTheDocument();
    });

    test('renders limited menu for Cliente', () => {
        /*
          Escenario: Usuario Cliente inicia sesión.
          NO debe ver gestión de pedidos interna.
          SI debe ver "Nueva Cotización", "Mis Pedidos" y "Mi Perfil".
        */
        useAuth.mockReturnValue({
            user: {
                first_name: 'Cliente',
                email: 'cliente@test.com',
                rol: { nombre: 'Cliente' }
            },
            logout: jest.fn()
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        // Aserciones Negativas (Lo que NO debe estar)
        expect(screen.queryByText(/Gestión de Pedidos/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Gestionar Clientes/i)).not.toBeInTheDocument();

        // Aserciones Positivas (Lo que SI debe estar)
        expect(screen.getByText(/Bienvenido a tu portal de clientes/i)).toBeInTheDocument();
        expect(screen.getByText(/Nueva Cotización/i)).toBeInTheDocument();
        expect(screen.getByText(/Mis Pedidos/i)).toBeInTheDocument();
    });

    test('renders specific menu for Despachador', () => {
        /*
          Escenario: Despachador (Rol limitado técnico).
          Solo ve Despachos y quizás Solicitudes/Pedidos básicos, pero NO Pagos ni Clientes.
        */
        useAuth.mockReturnValue({
            user: {
                first_name: 'Despachador',
                rol: { nombre: 'Despachador' }
            },
            logout: jest.fn()
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        // Ve Despachos (Busca título exacto)
        expect(screen.getByRole('heading', { name: /^Despachos$/i })).toBeInTheDocument();

        // NO ve Pagos (Rol financiero)
        expect(screen.queryByText(/Gestionar Pagos/i)).not.toBeInTheDocument();

        // NO ve Clientes (Rol administrativo)
        expect(screen.queryByText(/Gestionar Clientes/i)).not.toBeInTheDocument();
    });

    test('logout button triggers logout action', () => {
        /*
          Escenario: Usuario cierra sesión.
        */
        const mockLogout = jest.fn();
        useAuth.mockReturnValue({
            user: { rol: { nombre: 'Gerencia' } },
            logout: mockLogout
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        // Busca botón de Cerrar Sesión
        const logoutBtn = screen.getByText(/Cerrar Sesión/i);
        fireEvent.click(logoutBtn);

        // Verifica llamada al hook logout y redirección
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});
