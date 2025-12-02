// frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

// Importamos un componente simple de "cargando..."
// Puedes crear uno más elaborado si quieres.
const FullPageSpinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h1>Cargando...</h1>
    </div>
);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null); // <-- 1. NUEVO ESTADO PARA EL USUARIO
    const [loading, setLoading] = useState(true); // Estado para la carga inicial

    useEffect(() => {
        const bootstrapAuth = async () => {
            const storedToken = localStorage.getItem('accessToken');
            if (storedToken) {
                setToken(storedToken);
                const userData = await authService.fetchUserData();
                if (userData) {
                    setUser(userData); // Guardamos los datos si el token es válido
                } else {
                    // El token es inválido o expiró, lo limpiamos
                    localStorage.removeItem('accessToken');
                    setToken(null);
                }
            }
            setLoading(false);
        };

        bootstrapAuth();
    }, []);

    const login = async (email, password) => {
        await authService.login(email, password);
        const newStoredToken = localStorage.getItem('accessToken');
        setToken(newStoredToken);
        const userData = await authService.fetchUserData(); // <-- 2. OBTENEMOS DATOS TRAS EL LOGIN
        setUser(userData); // <-- 3. GUARDAMOS LOS DATOS
    };

    const logout = () => {
        authService.logout();
        setToken(null);
        setUser(null); // <-- 4. LIMPIAMOS LOS DATOS DEL USUARIO
    };

    // Mientras se verifica el token inicial, mostramos una pantalla de carga
    if (loading) {
        return <FullPageSpinner />;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};