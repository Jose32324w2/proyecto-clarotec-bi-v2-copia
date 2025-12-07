
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const ClientHistoryPage = () => {
    const { user } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // El token se inyecta automáticamente por el interceptor
                const response = await axios.get('http://127.0.0.1:8000/api/portal/historial/');
                setPedidos(response.data);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError('No pudimos cargar tu historial. Intenta nuevamente.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchHistory();
        }
    }, [user]);

    const getStatusBadge = (status) => {
        const badges = {
            'solicitud': 'bg-secondary',
            'cotizado': 'bg-primary',
            'aceptado': 'bg-info text-dark',
            'pagado': 'bg-success',
            'despachado': 'bg-warning text-dark',
            'completado': 'bg-success',
            'rechazado': 'bg-danger'
        };
        return <span className={`badge ${badges[status] || 'bg-secondary'}`}>{status.toUpperCase()}</span>;
    };

    if (loading) return <div className="p-5 text-center">Cargando historial...</div>;

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Mis Pedidos</h2>
                <Link to="/solicitar-cotizacion" className="btn btn-outline-primary shadow-sm">
                    + Nueva Cotización
                </Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {pedidos.length === 0 ? (
                <div className="text-center py-5 bg-light rounded shadow-sm">
                    <h4>Aún no tienes pedidos registrados con este email.</h4>
                    <p className="text-muted">Si acabas de solicitar una cotización, espera unos minutos a que aparezca aquí.</p>
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-4">Folio (ID)</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                        <th>Items</th>
                                        <th>Total Estimado</th>
                                        <th className="text-end pe-4">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map(pedido => (
                                        <tr key={pedido.id}>
                                            <td className="ps-4 fw-bold">#{pedido.id}</td>
                                            <td>{new Date(pedido.fecha_solicitud).toLocaleDateString()}</td>
                                            <td>{getStatusBadge(pedido.estado)}</td>
                                            <td>{pedido.items ? pedido.items.length : 0} productos</td>
                                            <td>
                                                {/* El total puede no estar calculado si es solicitud, mostrar mensaje */}
                                                {pedido.estado === 'solicitud' ?
                                                    <span className="text-muted small">Por Cotizar</span> :
                                                    `$${Math.round(pedido.costo_envio_estimado || 0).toLocaleString()}` // Esto es solo un ejemplo, idealmente sumar items
                                                }
                                            </td>
                                            <td className="text-end pe-4">
                                                {/* Si está cotizado, mandarlo al portal. Si no, solo ver detalle simple (o nada por ahora) */}
                                                {(pedido.estado === 'cotizado' || pedido.estado === 'aceptado' || pedido.estado === 'pagado') && pedido.id_seguimiento ? (
                                                    <Link
                                                        to={`/portal/pedidos/${pedido.id_seguimiento}`}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        Ver Cotización
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted small">En Proceso</span>
                                                )}
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
