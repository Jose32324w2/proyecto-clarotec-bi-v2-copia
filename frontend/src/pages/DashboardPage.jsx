/**
 * Panel de Administración Principal.
 * 
 * PROPÓSITO:
 * - Hub central para empleados (Vendedores, Gerencia).
 * - Renderiza tarjetas de acceso rápido según el ROL del usuario (RBAC).
 * - Acceso a módulos de Pedidos, Pagos, Despachos y Clientes.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Helper function to check user role
    const hasRole = (roleName) => {
        return user?.rol?.nombre?.toLowerCase() === roleName.toLowerCase();
    };

    // Check if user can see order management sections
    const canManageOrders = hasRole('Gerencia') || hasRole('Vendedor') || hasRole('Administrativa') || hasRole('Despachador');
    const canSeeSolicitudes = hasRole('Gerencia') || hasRole('Vendedor');
    const canSeeCotizaciones = hasRole('Gerencia') || hasRole('Vendedor');
    const canSeePagos = hasRole('Gerencia') || hasRole('Administrativa');
    const canSeeDespachos = hasRole('Gerencia') || hasRole('Despachador');
    const canManageAdmin = hasRole('Gerencia') || hasRole('Administrativa') || hasRole('Vendedor'); // Excluye Cliente y Despachador

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="mb-0">Panel de Administración</h1>
                    <p className="text-muted">
                        Bienvenido, {user?.first_name || user?.email || 'Usuario'}
                        {user?.rol?.nombre && ` - ${user.rol.nombre}`}
                    </p>
                </div>
                <button onClick={handleLogout} className="btn btn-outline-danger">
                    <i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                </button>
            </div>

            <div className="row g-4">
                {/* Sección de Pedidos */}
                {canManageOrders && (
                    <>
                        <div className="col-12">
                            <h5 className="text-muted mb-3 border-bottom pb-2">Gestión de Pedidos</h5>
                        </div>

                        {canSeeSolicitudes && (
                            <div className="col-md-4 col-lg-3">
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body text-center py-4">
                                        <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-inbox fs-1 text-primary"></i>
                                        </div>
                                        <h5 className="card-title">Solicitudes</h5>
                                        <p className="card-text text-muted small">Ver nuevas solicitudes de cotización.</p>
                                        <Link to="/panel/solicitudes" className="btn btn-primary w-100 stretched-link">Ir a Solicitudes</Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {canSeeCotizaciones && (
                            <div className="col-md-4 col-lg-3">
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body text-center py-4">
                                        <div className="rounded-circle bg-warning bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-file-earmark-text fs-1 text-warning"></i>
                                        </div>
                                        <h5 className="card-title">Cotizaciones</h5>
                                        <p className="card-text text-muted small">Seguimiento de cotizaciones enviadas.</p>
                                        <Link to="/panel/cotizaciones" className="btn btn-outline-dark w-100 stretched-link">Ver Cotizaciones</Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {canSeePagos && (
                            <div className="col-md-4 col-lg-3">
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body text-center py-4">
                                        <div className="rounded-circle bg-success bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-cash-coin fs-1 text-success"></i>
                                        </div>
                                        <h5 className="card-title">Pagos</h5>
                                        <p className="card-text text-muted small">Confirmar pagos de clientes.</p>
                                        <Link to="/panel/pagos" className="btn btn-outline-dark w-100 stretched-link">Gestionar Pagos</Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {canSeeDespachos && (
                            <div className="col-md-4 col-lg-3">
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body text-center py-4">
                                        <div className="rounded-circle bg-info bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-truck fs-1 text-info"></i>
                                        </div>
                                        <h5 className="card-title">Despachos</h5>
                                        <p className="card-text text-muted small">Gestionar envíos y entregas.</p>
                                        <Link to="/panel/despachos" className="btn btn-outline-dark w-100 stretched-link">Ver Despachos</Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Sección Cliente - Action Hub */}
                {hasRole('Cliente') && (
                    <div className="col-12">
                        <div className="alert alert-info border-0 shadow-sm mb-4">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            Bienvenido a tu portal de clientes. Aquí puedes gestionar tus solicitudes y pedidos.
                        </div>

                        <div className="row g-4">
                            <div className="col-md-6 col-lg-4">
                                <div className="card h-100 shadow-sm hover-shadow transition-all border-primary border-2">
                                    <div className="card-body text-center py-5">
                                        <div className="rounded-circle bg-primary text-white p-3 d-inline-block mb-3">
                                            <i className="bi bi-plus-lg fs-1"></i>
                                        </div>
                                        <h4 className="card-title fw-bold text-primary">Nueva Cotización</h4>
                                        <p className="card-text text-muted">Solicita productos para cotizar de forma rápida.</p>
                                        <Link to="/solicitar-cotizacion" className="btn btn-primary w-100 stretched-link mt-2">Crear Solicitud</Link>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6 col-lg-4">
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body text-center py-5">
                                        <div className="rounded-circle bg-success bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-list-check fs-1 text-success"></i>
                                        </div>
                                        <h4 className="card-title fw-bold">Mis Pedidos</h4>
                                        <p className="card-text text-muted">Revisa el estado de tus cotizaciones anteriores.</p>
                                        <Link to="/portal/mis-pedidos" className="btn btn-outline-success w-100 stretched-link mt-2">Ver Historial</Link>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6 col-lg-4">
                                <div className="card h-100 shadow-sm hover-shadow transition-all bg-light border-0">
                                    <div className="card-body text-center py-5">
                                        <div className="rounded-circle bg-secondary bg-opacity-10 p-3 d-inline-block mb-3">
                                            <i className="bi bi-person-circle fs-1 text-secondary"></i>
                                        </div>
                                        <h4 className="card-title fw-bold text-secondary">Mi Perfil</h4>
                                        <p className="card-text text-muted small">Edita tus datos de contacto.</p>
                                        <Link to="/portal/perfil" className="btn btn-outline-secondary w-100 stretched-link mt-2">Editar Perfil</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sección de Administración */}
                {canManageAdmin && (
                    <div className="col-12 mt-4">
                        <h5 className="text-muted mb-3 border-bottom pb-2">Inicio</h5>
                    </div>
                )}

                {canManageAdmin && (
                    <>
                        <div className="col-md-4 col-lg-3">
                            <div className="card h-100 shadow-sm hover-shadow transition-all">
                                <div className="card-body text-center py-4">
                                    <div className="rounded-circle bg-secondary bg-opacity-10 p-3 d-inline-block mb-3">
                                        <i className="bi bi-box-seam fs-1 text-secondary"></i>
                                    </div>
                                    <h5 className="card-title">Productos</h5>
                                    <p className="card-text text-muted small">Administrar catálogo de productos.</p>
                                    <Link to="/panel/productos" className="btn btn-outline-dark w-100 stretched-link">Gestionar Productos</Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4 col-lg-3">
                            <div className="card h-100 shadow-sm hover-shadow transition-all">
                                <div className="card-body text-center py-4">
                                    <div className="rounded-circle bg-secondary bg-opacity-10 p-3 d-inline-block mb-3">
                                        <i className="bi bi-people fs-1 text-secondary"></i>
                                    </div>
                                    <h5 className="card-title">Clientes</h5>
                                    <p className="card-text text-muted small">Ver base de datos de clientes.</p>
                                    <Link to="/panel/clientes" className="btn btn-outline-dark w-100 stretched-link">Gestionar Clientes</Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;