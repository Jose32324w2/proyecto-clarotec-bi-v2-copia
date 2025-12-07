import { render, screen } from '@testing-library/react';
import App from './App';

// Mock del hook useAuth para evitar errores de Contexto
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null, // Simulamos usuario no logueado
    token: null,
    loading: false
  })
}));

test('renders landing page title', () => {
  render(<App />);
  // Buscamos un texto que realmente exista en HomePage.jsx
  const titleElement = screen.getByText(/Acceso Trabajadores/i);
  expect(titleElement).toBeInTheDocument();
});
