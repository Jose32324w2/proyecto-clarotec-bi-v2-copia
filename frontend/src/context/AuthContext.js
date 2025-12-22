// AuthContext.js
// Contexto de Autenticación Global (Provider).
// 
// PROPÓSITO:
// - Mantiene el estado global del usuario (token, perfil, rol).
// - Provee funciones login/logout accesibles en toda la app.
// - Verifica la sesión al cargar la página (persistencia).

import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

// Importamos un componente simple de "cargando..."
// Puedes crear uno más elaborado si quieres.

// FullPageSpinner es un componente que muestra un mensaje de "cargando..." mientras se verifica la sesión
const FullPageSpinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h1>Cargando...</h1>
    </div>
);

// AuthContext es un contexto que provee acceso global a la autenticación
export const AuthContext = createContext();

// AuthProvider es un componente que provee el contexto de autenticación a toda la app
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null); // <-- 1. NUEVO ESTADO PARA EL USUARIO
    const [loading, setLoading] = useState(true); // Estado para la carga inicial

    // useEffect se ejecuta una vez al cargar la página
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

    // login es una función que se encarga de iniciar sesión
    const login = async (email, password) => {
        await authService.login(email, password);
        const newStoredToken = localStorage.getItem('accessToken');
        setToken(newStoredToken);
        const userData = await authService.fetchUserData(); // <-- 2. OBTENEMOS DATOS TRAS EL LOGIN
        setUser(userData); // <-- 3. GUARDAMOS LOS DATOS
    };

    // logout es una función que se encarga de cerrar sesión
    const logout = () => {
        authService.logout();
        setToken(null);
        setUser(null); // <-- 4. LIMPIAMOS LOS DATOS DEL USUARIO
    };

    // Mientras se verifica el token inicial, mostramos una pantalla de carga
    if (loading) {
        return <FullPageSpinner />;
    }

    return ( // renderiza el contexto de autenticación y sus hijos 
        <AuthContext.Provider value={{ token, user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};