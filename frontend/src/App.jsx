// frontend/src/App.jsx
/**
 * Componente Raíz de la Aplicación.
 * 
 * PROPÓSITO:
 * - Define el enrutamiento principal (React Router) para toda la SPA.
 * - Protege rutas privadas usando RequireAuth.
 * - Gestiona la navegación global entre páginas públicas y el panel de administración.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import './App.css';

// --- Importación de Páginas ---
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SolicitudPage from './pages/SolicitudPage';
import PortalPage from './pages/PortalPage';
import SolicitudesPanelPage from './pages/panel/SolicitudesPanelPage';
import CotizacionDetailPage from './pages/panel/CotizacionDetailPage';
import CotizacionesPanelPage from './pages/panel/CotizacionesPanelPage';
import PagosPanelPage from './pages/panel/PagosPanelPage';
import DespachosPanelPage from './pages/panel/DespachosPanelPage';
import ProductosPanelPage from './pages/panel/ProductosPanelPage';
import ClientesPanelPage from './pages/panel/ClientesPanelPage';
import BIPanelPage from './pages/panel/BIPanelPage';
import ClientRetentionPage from './pages/panel/ClientRetentionPage';


// --- Importación de Componentes ---
import ProtectedRoute from './components/auth/ProtectedRoute';

import { CartProvider } from './context/CartContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) {
        return null;
    }

    return (
        <nav className="navbar" style={{ padding: '1rem', backgroundColor: '#f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <Link to="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
                {user.rol && (user.rol.nombre === 'Vendedor' || user.rol.nombre === 'Gerencia') && (
                    <>
                        <Link to="/panel/solicitudes" style={{ marginRight: '1rem' }}>Solicitudes</Link>
                        <Link to="/panel/cotizaciones" style={{ marginRight: '1rem' }}>Cotizaciones</Link>
                    </>
                )}

                {/* --- NUEVO ENLACE PARA GERENCIA (BI) --- */}
                {user.rol && user.rol.nombre === 'Gerencia' && (
                    <>
                        <Link to="/panel/bi" style={{ marginRight: '1rem' }}>Inteligencia de Negocios</Link>
                        <Link to="/panel/bi/retention" style={{ marginRight: '1rem' }}>Retención (Churn)</Link>
                    </>
                )}

                {/* --- NUEVO ENLACE CONDICIONAL PARA ADMINISTRATIVA --- */}
                {user.rol && user.rol.nombre === 'Administrativa' && (
                    <Link to="/panel/pagos" style={{ marginRight: '1rem' }}>Pagos Pendientes</Link>
                )}
                {/* --- NUEVO ENLACE PARA DESPACHADOR --- */}
                {user.rol && user.rol.nombre === 'Despachador' && (
                    <Link to="/panel/despachos" style={{ marginRight: '1rem' }}>Despachos Pendientes</Link>
                )}
            </div>
            <div>
                {user && user.rol && <span style={{ marginRight: '1rem' }}>Hola, {user.first_name} ({user.rol.nombre})</span>}
                <button onClick={handleLogout}>Cerrar Sesión</button>
            </div>
        </nav>
    );
};



function App() {
    const { token } = useAuth();

    return (
        <CartProvider>
            <Router>
                <Navbar />
                <main>
                    <Routes>
                        {/* --- RUTAS PÚBLICAS --- */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/solicitar-cotizacion" element={<SolicitudPage />} />
                        <Route path="/portal/pedidos/:id_seguimiento" element={<PortalPage />} />

                        {/* --- RUTAS PROTEGIDAS --- */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/panel/solicitudes" element={<SolicitudesPanelPage />} />
                            <Route path="/panel/cotizacion/:pedidoId" element={<CotizacionDetailPage />} />
                            <Route path="/panel/cotizaciones" element={<CotizacionesPanelPage />} />
                            <Route path="/panel/pagos" element={<PagosPanelPage />} />
                            <Route path="/panel/despachos" element={<DespachosPanelPage />} />
                            <Route path="/panel/productos" element={<ProductosPanelPage />} />
                            <Route path="/panel/clientes" element={<ClientesPanelPage />} />
                            <Route path="/panel/bi" element={<BIPanelPage />} />
                            <Route path="/panel/bi/retention" element={<ClientRetentionPage />} />

                        </Route>

                        {/* Redirección por defecto */}
                        <Route path="*" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/" />} />
                    </Routes>
                </main>
            </Router>
        </CartProvider>
    );
}

export default App;