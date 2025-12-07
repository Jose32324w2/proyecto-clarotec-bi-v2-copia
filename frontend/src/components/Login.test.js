import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';

// Mock useAuth
jest.mock('../hooks/useAuth', () => ({
    useAuth: () => ({
        login: jest.fn(), // Mock de la función login
        user: null,
        loading: false
    })
}));

test('renders login form', () => {
    render(
        <BrowserRouter>
            <LoginPage />
        </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Ingresar/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
});

test('allows typing in input fields', () => {
    render(
        <BrowserRouter>
            <LoginPage />
        </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
});
