/**
 * Servicio de API de Autenticación.
 * 
 * PROPÓSITO:
 * - Capa de comunicación directa con los endpoints de JWT del backend (/token/).
 * - Gestiona almacenamiento de tokens en localStorage.
 * - Incluye lógica de Refresh Token.
 */
// frontend/src/services/authService.js
// Importaciones de librerías externas 
// Importaciones de librerías externas 
import axios from 'axios';
import config from '../config';

// Constantes
const API_URL = config.API_URL;

// Funciones

// Función de login
const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/token/`, {    // Envía el email y password al backend
        email,
        password,
    });
    if (response.data.access) { // Si el login es exitoso
        localStorage.setItem('accessToken', response.data.access); // Guardar access token
        localStorage.setItem('refreshToken', response.data.refresh);  // Guardar refresh token
    }
    return response.data; // Devuelve el response.data
};

// Función de logout
const logout = () => {
    localStorage.removeItem('accessToken'); // Limpiar access token
    localStorage.removeItem('refreshToken');  // Limpiar refresh token
};

// Función de refresh token
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) { // Si no hay refresh token
        return null;
    }
    try { // Intentar renovar el access token
        // Envía el refresh token al backend
        const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken
        });
        // Si el refresh token es válido, actualizamos el access token
        localStorage.setItem('accessToken', response.data.access);
        // Si el backend rota el refresh token, también lo actualizamos
        if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh);
        }
        // Devolvemos el access token
        return response.data.access;
    } catch (error) { // Si hay error
        console.error("Error refreshing token:", error);
        // Refresh token expirado o inválido, limpiar todo
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return null;
    }
};

// Función de fetch user data
const fetchUserData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { // Si no hay access token
        return null;
    }
    try { // Intentar obtener el user data
        const response = await axios.get(`${API_URL}/users/me/`, {
            // Envía el access token al backend
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) { // Si hay error al obtener el user data 
        console.error("Error fetching user data:", error);
        return null;
    }
};

const authService = { // Objeto de exportación
    login,
    logout,
    fetchUserData,
    refreshAccessToken,  // Exportar función de refresh
};

export default authService; // Exportar el objeto authService