// frontend/src/components/auth/LoginForm.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // <-- Importamos nuestro custom hook useAuth


// (Los estilos pueden mantenerse igual si lo deseas)
const formStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '300px',
    padding: '2rem',
    border: '1px solid #ccc',
    borderRadius: '8px',
};
const inputStyles = {
    padding: '0.5rem',
    fontSize: '1rem',
};
const buttonStyles = {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
};
const errorStyles = {
    color: 'red',
    marginTop: '1rem',
};

const LoginForm = () => {
    // 1. Usamos useState para tener "componentes controlados"
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 2. Obtenemos la función de login de nuestro contexto global
    const { login } = useAuth();

    // 3. Obtenemos el hook de navegación para una redirección SPA
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 4. Llamamos a la función de login del contexto
            await login(email, password);
            navigate('/inicio'); // Redirige a la página principal del dashboard

        } catch (err) {
            setError('Credenciales incorrectas o error en el servidor. Por favor, intente de nuevo.');
            console.error('Error en el login:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={formStyles}>
            <div>
                <label htmlFor="email">Correo Electrónico:</label>
                <input
                    type="email"
                    id="email"
                    value={email} // Conectamos el valor al estado
                    onChange={(e) => setEmail(e.target.value)} // Actualizamos el estado
                    required
                    style={inputStyles}
                />
            </div>
            <div>
                <label htmlFor="password">Contraseña:</label>
                <input
                    type="password"
                    id="password"
                    value={password} // Conectamos el valor al estado
                    onChange={(e) => setPassword(e.target.value)} // Actualizamos el estado
                    required
                    style={inputStyles}
                />
            </div>
            <button type="submit" disabled={loading} style={buttonStyles}>
                {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            {error && <p style={errorStyles}>{error}</p>}
        </form>
    );
};

export default LoginForm;