/**
 * Interceptor Global de Axios.
 * 
 * PROPÓSITO:
 * - Intercepta respuestas 401 (Unauthorized) del backend.
 * - Intenta renovar el token automáticamente (Refresh Token Flow).
 * - Si falla la renovación, cierra sesión y redirige al Login.
 */
// frontend/src/utils/axiosInterceptor.js

import axios from 'axios';
import authService from '../services/authService';

// Interceptor para manejar errores 401 y renovar token automáticamente
axios.interceptors.response.use(
    (response) => {
        // Si la respuesta es exitosa, simplemente la retornamos
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Si recibimos un 401, no hemos reintentado, Y NO ES EL LOGIN (evitar bucle)
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/token/')) {
            originalRequest._retry = true;

            console.log('Token expirado, intentando renovar...');

            // Intentar renovar el token
            const newToken = await authService.refreshAccessToken();

            if (newToken) {
                console.log('Token renovado exitosamente');
                // Actualizar el header de la petición original con el nuevo token
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                // Reintentar la petición original
                return axios(originalRequest);
            } else {
                console.log('No se pudo renovar el token, redirigiendo a login');
                // Si no se pudo renovar, redirigir al login
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }

        // Para cualquier otro error, simplemente lo rechazamos
        return Promise.reject(error);
    }
);

export default axios;
