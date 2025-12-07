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

export const useAuth = () => {
    return useContext(AuthContext);
};