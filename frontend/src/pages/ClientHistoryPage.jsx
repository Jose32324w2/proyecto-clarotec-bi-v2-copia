import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const ClientHistoryPage = () => {
    const { token } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (!token) return;
            try {
                const response = await axios.get('http://localhost:8000/api/portal/mis-pedidos/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPedidos(response.data);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError("No pudimos cargar tu historial. Intenta nuevamente.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [token]);

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'solicitud': return <span className="badge bg-warning text-dark">Solicitud Recibida</span>;
            case 'cotizado': return <span className="badge bg-info text-dark">Cotizado (Revisar)</span>;
            case 'aceptado': return <span className="badge bg-primary">Aceptado</span>;
            case 'pago_confirmado': return <span className="badge bg-success">En Proceso</span>;
            case 'despachado': return <span className="badge bg-success">Despachado</span>;
            case 'completado': return <span className="badge bg-success">Completado</span>;
            case 'rechazado': return <span className="badge bg-danger">Rechazado/Vencido</span>;
            default: return <span className="badge bg-secondary">{estado}</span>;
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 fw-bold">Mis Pedidos</h2>
                <Link to="/solicitar-cotizacion" className="btn btn-primary">
                    <i className="bi bi-plus-lg me-2"></i>Nueva Cotización
                </Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {pedidos.length === 0 ? (
                <div className="text-center py-5 bg-light rounded shadow-sm">
                    <i className="bi bi-cart-x display-1 text-muted"></i>
                    <p className="lead mt-3 text-muted">Aún no tienes pedidos registrados.</p>
                    <Link to="/solicitar-cotizacion" className="btn btn-primary mt-3">
                        Hacer mi primer pedido
                    </Link>
                </div>
            ) : (
                <div className="card shadow-sm border-0">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Pedido #</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                        <th>Total</th>
                                        <th className="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map(p => (
                                        <tr key={p.id}>
                                            <td className="ps-4 fw-bold text-primary">#{p.id}</td>
                                            <td>{new Date(p.fecha_solicitud).toLocaleDateString()}</td>
                                            <td>{getEstadoBadge(p.estado)}</td>
                                            <td>
                                                {p.total_cotizacion > 0
                                                    ? `$${parseFloat(p.total_cotizacion).toLocaleString('es-CL')}`
                                                    : <span className="text-muted small">Pendiente</span>}
                                            </td>
                                            <td className="text-end pe-4">
                                                {p.estado === 'cotizado' && (
                                                    <Link to={`/portal/pedidos/${p.id_seguimiento}`} className="btn btn-sm btn-success me-2">
                                                        <i className="bi bi-eye"></i> Ver Cotización
                                                    </Link>
                                                )}
                                                <Link to={`/portal/pedidos/${p.id_seguimiento}`} className="btn btn-sm btn-outline-primary">
                                                    Ver Detalle
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientHistoryPage;
