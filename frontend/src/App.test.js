import { render, screen } from '@testing-library/react';
import { AppContent } from './App';
import { MemoryRouter } from 'react-router-dom';

// Mock del hook useAuth para evitar errores de Contexto
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null, // Simulamos usuario no logueado
    token: null,
    loading: false
  })
}));

test('renders landing page title', () => {
  render(
    <MemoryRouter>
      <AppContent />
    </MemoryRouter>
  );
  // Buscamos un texto que realmente exista en HomePage.jsx
  const titleElement = screen.getByText(/Acceso Trabajadores/i);
  expect(titleElement).toBeInTheDocument();
});
