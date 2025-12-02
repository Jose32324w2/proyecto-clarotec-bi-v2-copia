import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Modal, Button } from 'react-bootstrap';

const PagosPanelPage = () => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'historial'

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState(null);

    const itemsPerPage = 10;

    useEffect(() => {
        fetchPedidos();
    }, [activeTab]); // fetchPedidos is stable if wrapped in useCallback, or we can omit it if we trust it doesn't change often, but better to wrap it.


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

    const fetchPedidos = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('accessToken');
            const endpoint = activeTab === 'pendientes'
                ? 'http://127.0.0.1:8000/api/pedidos/aceptados/'
                : 'http://127.0.0.1:8000/api/pedidos/historial-pagos/';

            const response = await axios.get(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPedidos(response.data);
            setFilteredPedidos(response.data);
        } catch (err) {
            console.error("Error al cargar pedidos:", err);
            setError('No se pudieron cargar los pedidos.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const handleConfirmarPago = async (pedidoId) => {
        if (!window.confirm(`¿Estás seguro de que deseas confirmar el pago para el pedido #${pedidoId}?`)) {
            return;
        }

        setUpdatingId(pedidoId);

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/confirmar-pago/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Eliminar de la lista local si estamos en pendientes
            if (activeTab === 'pendientes') {
                setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoId));
                setFilteredPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoId));
            } else {
                // Si estamos en historial (raro confirmar desde ahí, pero por si acaso), recargar
                fetchPedidos();
            }

            // Toast notification
            showToast('success', `¡Pago confirmado para el pedido #${pedidoId}!`);

        } catch (err) {
            console.error("Error al confirmar el pago:", err.response?.data?.error || err.message);
            showToast('error', `Error al confirmar el pago: ${err.response?.data?.error || 'Error desconocido'}`);
        } finally {
            setUpdatingId(null);
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

    const handleShowModal = (pedido) => {
        setSelectedPedido(pedido);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPedido(null);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'aceptado': return <span className="badge bg-info text-dark">Pendiente Pago</span>;
            case 'pago_confirmado': return <span className="badge bg-success">Pagado</span>;
            case 'despachado': return <span className="badge bg-primary">Despachado</span>;
            case 'completado': return <span className="badge bg-secondary">Completado</span>;
            case 'rechazado': return <span className="badge bg-danger">Rechazado</span>;
            default: return <span className="badge bg-secondary">{estado}</span>;
        }
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <i className="bi bi-cash-coin text-success me-2"></i>
                        Gestión de Pagos
                    </h2>
                    <p className="text-muted mb-0">
                        Administración de pagos y confirmaciones
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
                        className={`nav-link ${activeTab === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        <i className="bi bi-hourglass-split me-2"></i>
                        Pendientes de Pago
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'historial' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historial')}
                    >
                        <i className="bi bi-clock-history me-2"></i>
                        Historial de Pagos
                    </button>
                </li>
            </ul>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando pedidos...</p>
                </div>
            ) : error ? (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            ) : currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-cash-coin fs-1 text-muted d-block mb-3"></i>
                    <h5 className="text-muted">
                        {searchTerm || startDate || endDate ? 'No se encontraron resultados con los filtros aplicados' : (activeTab === 'pendientes' ? 'No hay pagos pendientes' : 'No hay historial de pagos')}
                    </h5>
                </div>
            ) : (
                <>
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-4">ID</th>
                                        <th>Cliente</th>
                                        <th>Empresa</th>
                                        <th>Fecha Actualización</th>
                                        <th>Estado</th>
                                        <th className="text-center">Monto Total</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(pedido => (
                                        <tr key={pedido.id}>
                                            <td className="px-4">
                                                <span className="badge bg-success">#{pedido.id}</span>
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
                                                {/* Calcular total si es posible, o mostrar items */}
                                                <span className="badge bg-secondary">{pedido.items.length} items</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleShowModal(pedido)}
                                                        title="Ver detalles"
                                                    >
                                                        <i className="bi bi-eye"></i> Ver
                                                    </button>

                                                    {activeTab === 'pendientes' && (
                                                        <button
                                                            onClick={() => handleConfirmarPago(pedido.id)}
                                                            disabled={updatingId === pedido.id}
                                                            className="btn btn-sm btn-success ms-1"
                                                            title="Confirmar Pago"
                                                        >
                                                            {updatingId === pedido.id ? (
                                                                <span className="spinner-border spinner-border-sm"></span>
                                                            ) : (
                                                                <i className="bi bi-check-lg"></i>
                                                            )}
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
                        <nav className="mt-4">
                            <ul className="pagination justify-content-center">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                                        <i className="bi bi-chevron-left"></i>
                                    </button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    )}
                </>
            )}

            {/* Modal de Detalles */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Pedido #{selectedPedido?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPedido && (
                        <div>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Información del Cliente</h6>
                                    <p className="mb-1"><strong>Nombre:</strong> {selectedPedido.cliente.nombre}</p>
                                    <p className="mb-1"><strong>Empresa:</strong> {selectedPedido.cliente.empresa || 'N/A'}</p>
                                    <p className="mb-1"><strong>Email:</strong> {selectedPedido.cliente.email}</p>
                                    <p className="mb-0"><strong>Teléfono:</strong> {selectedPedido.cliente.telefono || 'N/A'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Estado del Pedido</h6>
                                    <p className="mb-2">{getEstadoBadge(selectedPedido.estado)}</p>
                                    <p className="mb-1"><strong>Actualizado:</strong> {new Date(selectedPedido.fecha_actualizacion).toLocaleString()}</p>
                                    {selectedPedido.id_seguimiento && (
                                        <p className="mb-0"><strong>ID Seguimiento:</strong> <small className="text-muted">{selectedPedido.id_seguimiento}</small></p>
                                    )}
                                </div>
                            </div>

                            <h6 className="text-muted mb-3">Items del Pedido</h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Descripción</th>
                                            <th className="text-center" style={{ width: '100px' }}>Cantidad</th>
                                            <th className="text-end" style={{ width: '150px' }}>Precio Unit.</th>
                                            <th className="text-end" style={{ width: '150px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPedido.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.descripcion}</td>
                                                <td className="text-center">{item.cantidad}</td>
                                                <td className="text-end">${item.precio_unitario?.toLocaleString() || '0'}</td>
                                                <td className="text-end">${((item.precio_unitario || 0) * item.cantidad).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cerrar
                    </Button>
                    {activeTab === 'pendientes' && selectedPedido && (
                        <Button
                            variant="success"
                            onClick={() => {
                                handleCloseModal();
                                handleConfirmarPago(selectedPedido.id);
                            }}
                        >
                            Confirmar Pago
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PagosPanelPage;