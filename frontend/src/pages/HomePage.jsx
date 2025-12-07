/**
 * Landing Page (Página de Inicio).
 * 
 * PROPÓSITO:
 * - Primera impresión para nuevos clientes.
 * - Explica el modelo de negocio "Compras Técnicas".
 * - Redirige a "Solicitar Cotización" o "Login".
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
    const { user } = useAuth();

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="position-relative overflow-hidden text-center bg-dark text-white" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.4
                }}></div>

                {/* Header Overlay */}
                <div className="position-absolute top-0 end-0 p-4 z-2">
                    <Link to="/login" className="btn btn-outline-light btn-sm fw-bold rounded-pill px-3">
                        <i className="bi bi-person-lock me-2"></i>
                        Acceso Trabajadores
                    </Link>
                </div>

                <div className="container position-relative z-1">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="badge bg-success bg-opacity-75 mb-3 px-3 py-2 rounded-pill">GESTIÓN DE ABASTECIMIENTO INDUSTRIAL</div>
                            <h1 className="display-3 fw-bold mb-4">Tu aliado estratégico en <span className="text-success">Compras Técnicas</span></h1>
                            <p className="lead mb-5 text-light opacity-75">
                                No pierdas tiempo buscando proveedores. Nosotros gestionamos, consolidamos y despachamos tus herramientas e insumos industriales, sin importar la marca.
                            </p>
                            <div className="d-flex gap-3 justify-content-center">
                                <Link to="/solicitar-cotizacion" className="btn btn-success btn-lg px-5 py-3 fw-bold shadow-lg">
                                    <i className="bi bi-box-seam me-2"></i> Iniciar Pedido
                                </Link>
                                {!user && (
                                    <Link to="/register" className="btn btn-light btn-lg px-5 py-3 fw-bold shadow-lg text-dark">
                                        <i className="bi bi-person-plus me-2"></i> Registrarse
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-5">
                <div className="container py-5">
                    <div className="text-center mb-5">
                        <h2 className="fw-bold">¿Cómo funciona nuestro modelo?</h2>
                        <p className="text-muted">Actuamos como tu departamento de compras externo. Simplificamos el proceso en 3 pasos.</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="card h-100 border-0 shadow-sm p-4 text-center hover-lift">
                                <div className="mb-3 text-success">
                                    <i className="bi bi-link-45deg display-4"></i>
                                </div>
                                <h5 className="fw-bold">1. Envía tu Requerimiento</h5>
                                <p className="text-muted small">
                                    Pega los links de los productos que viste en Sodimac, Easy o cualquier proveedor. O simplemente descríbelos.
                                </p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 border-0 shadow-sm p-4 text-center hover-lift">
                                <div className="mb-3 text-success">
                                    <i className="bi bi-calculator display-4"></i>
                                </div>
                                <h5 className="fw-bold">2. Cotizamos y Gestionamos</h5>
                                <p className="text-muted small">
                                    Nuestro equipo negocia precios, verifica stock y consolida todo en una sola factura para tu empresa.
                                </p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 border-0 shadow-sm p-4 text-center hover-lift">
                                <div className="mb-3 text-success">
                                    <i className="bi bi-truck display-4"></i>
                                </div>
                                <h5 className="fw-bold">3. Despacho Unificado</h5>
                                <p className="text-muted small">
                                    Recibe todo tu pedido en una sola entrega, ahorrando costos logísticos y tiempos administrativos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;