// frontend/src/components/auth/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // <-- 1. Importamos el hook

const ProtectedRoute = () => {
    // 2. Obtenemos el token directamente de nuestro contexto, no de localStorage
    const { token } = useAuth();

    // 3. La lógica sigue siendo la misma, pero ahora es más limpia y centralizada
    if (!token) {
        // Si no hay token en nuestro estado global, redirigimos al login
        return <Navigate to="/login" />;
    }

    // Si hay token, permitimos el acceso a las rutas anidadas (Dashboard, etc.)
    return <Outlet />;
};

export default ProtectedRoute;