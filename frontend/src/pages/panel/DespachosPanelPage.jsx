import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import PaginationControl from '../../components/common/PaginationControl';

const COURIERS_LABELS = {
    'STARKEN': 'Starken',
    'CHILEXPRESS': 'Chilexpress',
    'BLUE': 'Blue Express',
    'OTRO': 'Otro / Transporte Propio'
};

// Modal component for dispatch form
const DespachoModal = ({ pedido, onClose, onConfirm }) => {
    const [transportista, setTransportista] = useState('');
    const [numeroGuia, setNumeroGuia] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (pedido) {
            // Pre-fill transportista based on client selection
            if (pedido.metodo_envio) {
                if (pedido.metodo_envio === 'OTRO') {
                    setTransportista(pedido.nombre_transporte_custom || 'Otro / Transporte Propio');
                } else {
                    setTransportista(COURIERS_LABELS[pedido.metodo_envio] || pedido.metodo_envio);
                }
            }
        }
    }, [pedido]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(pedido.id, { transportista, numeroGuia });
        setSubmitting(false);
    };

    return (
        <Modal show={true} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-truck me-2"></i>
                    Despachar Pedido #{pedido.id}
                </Modal.Title>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="mb-3">
                        <p className="text-muted">
                            <strong>Cliente:</strong> {pedido.cliente.nombre}
                        </p>
                        {pedido.metodo_envio && (
                            <div className="alert alert-info py-2">
                                <small>
                                    <i className="bi bi-info-circle me-1"></i>
                                    El cliente seleccionó: <strong>{COURIERS_LABELS[pedido.metodo_envio] || pedido.metodo_envio}</strong>
                                    {pedido.metodo_envio === 'OTRO' && pedido.nombre_transporte_custom && ` (${pedido.nombre_transporte_custom})`}
                                </small>
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="transportista" className="form-label">
                            Transportista <span className="text-danger">*</span>
                        </label>
                        <input
                            id="transportista"
                            type="text"
                            className="form-control"
                            value={transportista}
                            onChange={(e) => setTransportista(e.target.value)}
                            required
                            placeholder="Ej: Chilexpress, Starken, etc."
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="numeroGuia" className="form-label">
                            Número de Guía / Seguimiento <span className="text-danger">*</span>
                        </label>
                        <input
                            id="numeroGuia"
                            type="text"
                            className="form-control"
                            value={numeroGuia}
                            onChange={(e) => setNumeroGuia(e.target.value)}
                            required
                            placeholder="Ej: 123456789"
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={submitting}>
                        {submitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2"></i>
                                Confirmar Despacho
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

const DespachosPanelPage = () => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPedido, setSelectedPedido] = useState(null); // For dispatch modal
    const [viewPedido, setViewPedido] = useState(null); // For view details modal
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('por_despachar'); // 'por_despachar' | 'historial'
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    const itemsPerPage = 10;

    const fetchPedidos = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('accessToken');
            const endpoint = activeTab === 'por_despachar'
                ? `${process.env.REACT_APP_API_URL}/pedidos/para-despachar/`
                : `${process.env.REACT_APP_API_URL}/pedidos/historial-despachos/`;

            const response = await axios.get(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPedidos(response.data);
            setFilteredPedidos(response.data);
        } catch (err) {
            console.error("Error fetching pedidos:", err);
            setError('No se pudieron cargar los pedidos.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchPedidos();
    }, [fetchPedidos]);

    useEffect(() => {
        let filtered = pedidos;

        // Filtro por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.id.toString().includes(searchTerm)
            );
        }

        // Filtro por fechas
        if (startDate) {
            filtered = filtered.filter(p => new Date(p.fecha_actualizacion) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => new Date(p.fecha_actualizacion) <= end);
        }

        setFilteredPedidos(filtered);
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, pedidos]);

    // Lógica de Ordenamiento
    const sortedFilteredPedidos = React.useMemo(() => {
        let sortableItems = [...filteredPedidos];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'cliente') {
                    aValue = `${a.cliente.nombre}`.toLowerCase(); // Nombre cliente es string 'nombre' en este endpoint
                    bValue = `${b.cliente.nombre}`.toLowerCase();
                } else if (sortConfig.key === 'empresa') {
                    aValue = (a.cliente.empresa || '').toLowerCase();
                    bValue = (b.cliente.empresa || '').toLowerCase();
                } else if (sortConfig.key === 'items_count') {
                    aValue = a.items ? a.items.length : 0;
                    bValue = b.items ? b.items.length : 0;
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
    }, [filteredPedidos, sortConfig]);

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

    const handleMarcarDespachado = async (pedidoId, { transportista, numeroGuia }) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`${process.env.REACT_APP_API_URL}/pedidos/${pedidoId}/marcar-despachado/`,
                { transportista, numero_guia: numeroGuia },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (activeTab === 'por_despachar') {
                setPedidos(prev => prev.filter(p => p.id !== pedidoId));
                setFilteredPedidos(prev => prev.filter(p => p.id !== pedidoId));
            } else {
                fetchPedidos();
            }

            setSelectedPedido(null);
            showToast('success', `Pedido #${pedidoId} marcado como despachado`);
        } catch (err) {
            showToast('error', `Error al despachar el pedido: ${err.response?.data?.error || 'Error desconocido'}`);
        }
    };

    const showToast = (type, message) => {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'pago_confirmado': return <span className="badge bg-warning text-dark">Por Despachar</span>;
            case 'despachado': return <span className="badge bg-primary">Despachado</span>;
            case 'completado': return <span className="badge bg-success">Completado</span>;
            default: return <span className="badge bg-secondary">{estado}</span>;
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedFilteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedFilteredPedidos.length / itemsPerPage);

    return (
        <div className="container mt-4">
            {selectedPedido && (
                <DespachoModal
                    pedido={selectedPedido}
                    onClose={() => setSelectedPedido(null)}
                    onConfirm={handleMarcarDespachado}
                />
            )}

            {/* Modal de Detalles (Solo lectura) */}
            <Modal show={!!viewPedido} onHide={() => setViewPedido(null)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Despacho #{viewPedido?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewPedido && (
                        <div>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Información del Cliente</h6>
                                    <p className="mb-1"><strong>Nombre:</strong> {viewPedido.cliente.nombre}</p>
                                    <p className="mb-1"><strong>Empresa:</strong> {viewPedido.cliente.empresa || 'N/A'}</p>
                                    <p className="mb-1"><strong>Email:</strong> {viewPedido.cliente.email}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Información de Despacho</h6>
                                    <p className="mb-2">{getEstadoBadge(viewPedido.estado)}</p>
                                    <p className="mb-1"><strong>Transportista:</strong> {viewPedido.transportista || 'N/A'}</p>
                                    <p className="mb-1"><strong>N° Guía:</strong> {viewPedido.numero_guia || 'N/A'}</p>
                                    <p className="mb-1"><strong>Fecha Despacho:</strong> {viewPedido.fecha_despacho ? new Date(viewPedido.fecha_despacho).toLocaleString() : 'Pendiente'}</p>
                                </div>
                            </div>

                            <h6 className="text-muted mb-3">Items del Pedido</h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Descripción</th>
                                            <th className="text-center" style={{ width: '100px' }}>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewPedido.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.descripcion}</td>
                                                <td className="text-center">{item.cantidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setViewPedido(null)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <i className="bi bi-truck text-info me-2"></i>
                        Panel de Despachos
                    </h2>
                    <p className="text-muted mb-0">
                        Gestión de envíos y seguimiento
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="input-group">
                        <span className="input-group-text bg-white">
                            <i className="bi bi-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por cliente, empresa o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="btn btn-outline-secondary" onClick={() => setSearchTerm('')}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="input-group">
                        <span className="input-group-text">Desde</span>
                        <input
                            type="date"
                            className="form-control"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="input-group">
                        <span className="input-group-text">Hasta</span>
                        <input
                            type="date"
                            className="form-control"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-2">
                    {(startDate || endDate) && (
                        <button
                            className="btn btn-outline-secondary w-100"
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                        >
                            Limpiar Fechas
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'por_despachar' ? 'active' : ''}`}
                        onClick={() => setActiveTab('por_despachar')}
                    >
                        <i className="bi bi-box-seam me-2"></i>
                        Por Despachar
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'historial' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historial')}
                    >
                        <i className="bi bi-clock-history me-2"></i>
                        Historial de Despachos
                    </button>
                </li>
            </ul>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando despachos...</p>
                </div>
            ) : error ? (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            ) : currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-truck fs-1 text-muted d-block mb-3"></i>
                    <h5 className="text-muted">
                        {searchTerm || startDate || endDate ? 'No se encontraron resultados con los filtros aplicados' : (activeTab === 'por_despachar' ? 'No hay pedidos por despachar' : 'No hay historial de despachos')}
                    </h5>
                </div>
            ) : (
                <>
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-4" onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                                            ID {getSortIcon('id')}
                                        </th>
                                        <th onClick={() => requestSort('cliente')} style={{ cursor: 'pointer' }}>
                                            Cliente {getSortIcon('cliente')}
                                        </th>
                                        <th onClick={() => requestSort('empresa')} style={{ cursor: 'pointer' }}>
                                            Empresa {getSortIcon('empresa')}
                                        </th>
                                        <th onClick={() => requestSort('fecha_actualizacion')} style={{ cursor: 'pointer' }}>
                                            Actualización {getSortIcon('fecha_actualizacion')}
                                        </th>
                                        <th onClick={() => requestSort('estado')} style={{ cursor: 'pointer' }}>
                                            Estado {getSortIcon('estado')}
                                        </th>
                                        <th className="text-center" onClick={() => requestSort('items_count')} style={{ cursor: 'pointer' }}>
                                            Items {getSortIcon('items_count')}
                                        </th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(pedido => (
                                        <tr key={pedido.id}>
                                            <td className="px-4">
                                                <span className="badge bg-info text-dark">#{pedido.id}</span>
                                            </td>
                                            <td><strong>{pedido.cliente.nombre}</strong></td>
                                            <td>{pedido.cliente.empresa || '-'}</td>
                                            <td>
                                                <small>{new Date(pedido.fecha_actualizacion).toLocaleDateString('es-ES')}</small>
                                                <br />
                                                <small className="text-muted">
                                                    {new Date(pedido.fecha_actualizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </small>
                                            </td>
                                            <td>{getEstadoBadge(pedido.estado)}</td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary">{pedido.items.length}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => setViewPedido(pedido)}
                                                        title="Ver detalles"
                                                    >
                                                        <i className="bi bi-eye"></i> Ver
                                                    </button>

                                                    {activeTab === 'por_despachar' && (
                                                        <button
                                                            onClick={() => setSelectedPedido(pedido)}
                                                            className="btn btn-sm btn-info ms-1"
                                                            title="Despachar"
                                                        >
                                                            <i className="bi bi-truck"></i> Despachar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <PaginationControl
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default DespachosPanelPage;