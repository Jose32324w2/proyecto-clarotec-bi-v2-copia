/*
Módulo de Pruebas Unitarias Frontend: SolicitudPage (Cotizador Público).

Verifica la lógica de la página principal de solicitudes, incluyendo:
- Renderizado de campos del formulario.
- Validación de botón de envío (Desactivado si falta info).
- Interacción con el contexto del carrito (CartContext).
- Envío exitoso de datos a la API (Axios).
*/
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SolicitudPage from './SolicitudPage';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';

// --- MOCKS (Simulaciones) ---

/*
  MOCK DE AXIOS:
  Simulamos la librería HTTP para no hacer llamadas reales al backend durante el test.
*/
jest.mock('axios');

/*
  MOCK DE CART CONTEXT:
  El componente SolicitudPage depende de 'useCart' para saber qué productos se van a pedir.
  Aquí definimos un comportamiento base (mock) que podremos sobreescribir en cada test si es necesario.
*/
jest.mock('../context/CartContext', () => ({
    useCart: jest.fn()
}));

/*
  MOCK DE AUTH HOOK:
  Simulamos el usuario logueado o anónimo.
*/
jest.mock('../hooks/useAuth', () => ({
    useAuth: jest.fn()
}));

/*
  MOCK DE COMPONENTES HIJOS COMPLEJOS:
  Para simplificar la prueba unitaria de la PÁGINA, podemos "mockear" los componentes hijos
  que no son el foco de este test (ej: CatalogCard, CartSummary), renderizando solo un div simple.
  Esto aisla la lógica de la página de la lógica de sus componentes hijos.
*/
jest.mock('../components/quotation/LinkInput', () => () => <div data-testid="link-input">LinkInput Mock</div>);
jest.mock('../components/quotation/ManualInput', () => () => <div data-testid="manual-input">ManualInput Mock</div>);
jest.mock('../components/quotation/CatalogCard', () => () => <div>CatalogCard Mock</div>);
// CartSummary lo dejamos "real" o también lo mockeamos si es muy complejo. Por ahora lo mockeamos para control total.
jest.mock('../components/quotation/CartSummary', () => () => <div data-testid="cart-summary">Resumen Carrito</div>);


describe('SolicitudPage Component', () => {

    // Configuración previa a cada test individual
    beforeEach(() => {
        // Limpiamos los mocks para que el conteo de llamadas empiece en cero.
        jest.clearAllMocks();

        // CONFIGURACIÓN POR DEFECTO DE LOS HOOKS:

        // Simula un carrito con 1 producto (para que el botón de enviar no esté deshabilitado por vacío).
        useCart.mockReturnValue({
            cart: [{ source: 'MANUAL', name: 'Producto Test', qty: 1 }],
            clearCart: jest.fn() // Función espía para limpiar carrito.
        });

        // Simula usuario anónimo (sin sesión iniciada).
        useAuth.mockReturnValue({
            user: null
        });

        // Simula respuesta exitosa al cargar productos frecuentes (para evitar errores de useEffect).
        axios.get.mockResolvedValue({ data: [] });
    });

    test('renders form fields correctly', async () => {
        /*
          PASO 1: RENDERIZADO
          Renderizamos la página dentro del Router.
        */
        render(
            <BrowserRouter>
                <SolicitudPage />
            </BrowserRouter>
        );

        /*
          PASO 2: VERIFICACIÓN DE ELEMENTOS
          Buscamos los inputs del formulario de contacto.
        */
        // Esperamos que se carguen los productos (lo cual actualiza el estado).
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        expect(screen.getByPlaceholderText(/Nombre \*/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Apellido \*/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Email Corporativo \*/i)).toBeInTheDocument();

        // Verifica que el select de regiones exista (buscando por texto por defecto).
        expect(screen.getByText(/Seleccione Región.../i)).toBeInTheDocument();
    });

    test('updates form state on user typing', async () => {
        /*
          Escenario: Usuario llena el formulario.
        */
        render(
            <BrowserRouter>
                <SolicitudPage />
            </BrowserRouter>
        );

        // --- FIX: Esperar a que el useEffect termine para evitar advertencias de 'act' ---
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        const nameInput = screen.getByPlaceholderText(/Nombre \*/i);
        const emailInput = screen.getByPlaceholderText(/Email Corporativo \*/i);

        /*
          PASO 3: INTERACCIÓN
          Simulamos tipeo.
        */
        fireEvent.change(nameInput, { target: { value: 'Juan' } });
        fireEvent.change(emailInput, { target: { value: 'juan@test.com' } });

        /*
          PASO 4: ASERCIÓN
          Verificamos que el valor se haya actualizado.
        */
        expect(nameInput.value).toBe('Juan');
        expect(emailInput.value).toBe('juan@test.com');
    });

    test('submit button is disabled if form is incomplete', async () => {
        /*
          Escenario: Formulario vacío.
          El botón de enviar debería estar deshabilitado.
        */
        render(
            <BrowserRouter>
                <SolicitudPage />
            </BrowserRouter>
        );

        // --- FIX: Esperar a que el useEffect termine para evitar advertencias de 'act' ---
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        // Buscamos el botón por el texto que contiene.
        const submitButton = screen.getByText(/Solicitar Cotización Formal/i);

        // Verificamos propiedad 'disabled'.
        expect(submitButton).toBeDisabled();
    });

    test('submits data successfully when form is valid', async () => {
        /*
          Escenario Flujo Completo: Llenar formulario y enviar.
        */

        // 1. Configuramos Mock de Axios para responder éxito al POST.
        axios.post.mockResolvedValue({ data: { status: 'success' } });

        render(
            <BrowserRouter>
                <SolicitudPage />
            </BrowserRouter>
        );

        // --- FIX: Esperar a que el useEffect termine para evitar advertencias de 'act' ---
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        // 2. Llenamos campos obligatorios.
        fireEvent.change(screen.getByPlaceholderText(/Nombre \*/i), { target: { name: 'nombre', value: 'Juan' } });
        fireEvent.change(screen.getByPlaceholderText(/Apellido \*/i), { target: { name: 'apellido', value: 'Perez' } });
        fireEvent.change(screen.getByPlaceholderText(/Email Corporativo \*/i), { target: { name: 'email', value: 'juan@em.com' } });

        // CORRECCIÓN ESTRATÉGICA:
        // Usaremos getAllByRole para obtener los selects de región y comuna por orden.
        const selects = screen.getAllByRole('combobox');
        const regionSelect = selects[0];
        const comunaSelect = selects[1];

        // Simulamos cambio de Región explícitamente pasando el nombre para asegurar que handleClientChange funcione.
        fireEvent.change(regionSelect, { target: { name: 'region', value: 'Metropolitana de Santiago' } });

        // Simulamos cambio de Comuna.
        fireEvent.change(comunaSelect, { target: { name: 'comuna', value: 'Santiago' } });


        // 3. Buscamos y verificamos botón habilitado.
        // Debido a que React puede tardar un milisegundo en re-renderizar estado disabled,
        // esperamos a que esté habilitado.
        const submitBtn = screen.getByText(/Solicitar Cotización Formal/i);
        await waitFor(() => expect(submitBtn).not.toBeDisabled());

        // 4. Click en Enviar.
        fireEvent.click(submitBtn);

        // 5. Verificamos llamada a API.
        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        // Verificamos que se llamó con la URL correcta.
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/solicitudes/'),
            expect.any(Object) // Payload
        );

        // 6. Verificamos pantalla de éxito.
        // 6. Verificamos pantalla de éxito.
        expect(await screen.findByText(/¡Solicitud Enviada!/i)).toBeInTheDocument();
    });
});
