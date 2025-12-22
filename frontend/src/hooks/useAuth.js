/**
 * Cuestan Hook: useAuth
 * 
 * PROPÓSITO:
 * - Facilita el acceso al AuthContext desde cualquier componente funcional.
 * - Evita importar useContext y AuthContext repetidamente.
 */
// frontend/src/hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// useAuth es un hook que permite acceder al contexto de autenticación desde cualquier componente
export const useAuth = () => {
    return useContext(AuthContext);
};