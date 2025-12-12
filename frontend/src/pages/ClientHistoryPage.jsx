import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const ClientHistoryPage = () => {
    const { token } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' }); // Por defecto ID mas reciente

    // Ordenamiento
    const sortedPedidos = React.useMemo(() => {
        let sortableItems = [...pedidos];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Manejo de valores nulos o "Pendiente" en total
                if (sortConfig.key === 'total_cotizacion') {
                    aValue = parseFloat(aValue || 0);
                    bValue = parseFloat(bValue || 0);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [pedidos, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
        return sortConfig.direction === 'ascending'
            ? <i className="bi bi-sort-down ms-1 text-primary"></i>
            : <i className="bi bi-sort-up ms-1 text-primary"></i>;
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (!token) return;
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/portal/mis-pedidos/`, {
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
                                        <th className="ps-4" onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                                            Pedido # {getSortIcon('id')}
                                        </th>
                                        <th onClick={() => requestSort('fecha_solicitud')} style={{ cursor: 'pointer' }}>
                                            Fecha {getSortIcon('fecha_solicitud')}
                                        </th>
                                        <th onClick={() => requestSort('estado')} style={{ cursor: 'pointer' }}>
                                            Estado {getSortIcon('estado')}
                                        </th>
                                        <th onClick={() => requestSort('total_cotizacion')} style={{ cursor: 'pointer' }}>
                                            Total {getSortIcon('total_cotizacion')}
                                        </th>
                                        <th className="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPedidos.map(p => (
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
