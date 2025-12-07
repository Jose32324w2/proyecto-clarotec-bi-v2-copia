/**
 * Servicio de API de Autenticación.
 * 
 * PROPÓSITO:
 * - Capa de comunicación directa con los endpoints de JWT del backend (/token/).
 * - Gestiona almacenamiento de tokens en localStorage.
 * - Incluye lógica de Refresh Token.
 */
// frontend/src/services/authService.js

import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/token/`, {
        email,
        password,
    });
    if (response.data.access) {
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);  // NUEVO: Guardar refresh token
    }
    return response.data;
};

const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');  // NUEVO: Limpiar refresh token
};

// NUEVA FUNCIÓN: Renovar access token usando refresh token
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        return null;
    }
    try {
        const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken
        });
        localStorage.setItem('accessToken', response.data.access);
        // Si el backend rota el refresh token, también lo actualizamos
        if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh);
        }
        return response.data.access;
    } catch (error) {
        console.error("Error refreshing token:", error);
        // Refresh token expirado o inválido, limpiar todo
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return null;
    }
};

const fetchUserData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return null;
    }
    try {
        const response = await axios.get(`${API_URL}/users/me/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
};

const authService = {
    login,
    logout,
    fetchUserData,
    refreshAccessToken,  // NUEVO: Exportar función de refresh
};

export default authService;