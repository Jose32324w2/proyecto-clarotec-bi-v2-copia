/*
Módulo de Pruebas Unitarias Frontend: Login.

Verifica que el componente visual de inicio de sesión se renderice correctamente
y responda a las interacciones básicas del usuario(escribir email / password).
*/
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';
import { MemoryRouter } from 'react-router-dom';

/*
  MOCK DE AUTH (Simulación de Hooks):
  Simulamos el hook 'useAuth' para aislar el componente.
  No queremos probar la API real, solo que el componente LLAME a la función login.
*/
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn(), // Función espía (spy) que no hace nada pero registra si fue llamada.
    user: null,       // Simulamos que no hay usuario logueado.
    loading: false    // Simulamos que no está cargando.
  })
}));

test('renders login form', () => {
  /*
    PASO 1:RENDERIZADO (Render)
    Montamos el componente LoginPage en un DOM virtual.
    Lo envolvemos en MemoryRouter porque LoginPage usa enlaces (Link) o navegación.
  */
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

  /*
    PASO 2: BÚSQUEDA DE ELEMENTOS (Query)
    Buscamos los campos por su etiqueta asociada (Label) o rol ARIA.
    Esto simula cómo un usuario ciego o lector de pantalla encontraría los elementos.
  */
  const emailInput = screen.getByLabelText(/Correo Electrónico/i);
  const passwordInput = screen.getByLabelText(/Contraseña/i);
  const submitButton = screen.getByRole('button', { name: /Ingresar/i });

  /*
    PASO 3: ASERCIONES (Assertions)
    Verificamos que los elementos existan efectivamente en el documento visible.
  */
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(submitButton).toBeInTheDocument();
});

test('allows typing in input fields', () => {
  /* 
    Escenario: El usuario escribe sus credenciales.
  */
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

  const emailInput = screen.getByLabelText(/Correo Electrónico/i);
  const passwordInput = screen.getByLabelText(/Contraseña/i);

  /*
    PASO 4: SIMULACIÓN DE EVENTOS (FireEvent)
    Simulamos que el usuario tipea 'test@example.com' en el campo email.
  */
  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

  // Simulamos tipeo de contraseña.
  fireEvent.change(passwordInput, { target: { value: 'password123' } });

  /*
    PASO 5: VERIFICACIÓN DE ESTADO
    Comprobamos que el valor interno del input haya cambiado.
    (Esto confirma que el componente maneja bien el 'onChange').
  */
  expect(emailInput.value).toBe('test@example.com');
  expect(passwordInput.value).toBe('password123');
});
