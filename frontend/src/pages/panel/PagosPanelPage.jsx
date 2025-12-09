import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Modal, Button } from 'react-bootstrap';
import PaginationControl from '../../components/common/PaginationControl';

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

    const [showModal, setShowModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

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

    // Lógica de Ordenamiento
    const sortedFilteredPedidos = React.useMemo(() => {
        let sortableItems = [...filteredPedidos];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Manejo especial para columnas calculadas o anidadas
                if (sortConfig.key === 'cliente') {
                    aValue = `${a.cliente.nombres} ${a.cliente.apellidos}`.toLowerCase();
                    bValue = `${b.cliente.nombres} ${b.cliente.apellidos}`.toLowerCase();
                } else if (sortConfig.key === 'empresa') {
                    aValue = (a.cliente.empresa || '').toLowerCase();
                    bValue = (b.cliente.empresa || '').toLowerCase();
                } else if (sortConfig.key === 'monto') {
                    aValue = parseFloat(a.total_cotizacion || 0);
                    bValue = parseFloat(b.total_cotizacion || 0);
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

    const handleRechazarPago = async (pedidoId) => {
        if (!window.confirm(`⚠️ ¿Realmente deseas RECHAZAR el pago del pedido #${pedidoId}?\nSe enviará una notificación al cliente.`)) {
            return;
        }

        setUpdatingId(pedidoId);

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/rechazar-pago/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Eliminar de la lista local si estamos en pendientes
            if (activeTab === 'pendientes') {
                setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoId));
                setFilteredPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoId));
            } else {
                fetchPedidos();
            }

            showToast('success', `Pago rechazado para el pedido #${pedidoId}.`);
            setShowModal(false); // Cerrar modal si se hizo desde ahí

        } catch (err) {
            console.error("Error al rechazar el pago:", err.response?.data?.error || err.message);
            showToast('error', `Error al rechazar pago: ${err.response?.data?.error || 'Error desconocido'}`);
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
    const currentItems = sortedFilteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedFilteredPedidos.length / itemsPerPage);

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'aceptado': return <span className="badge bg-info text-dark">Pendiente Pago</span>;
            case 'rechazado': return <span className="badge bg-danger">Rechazado</span>;
            // Para fines de PAGOS, despachado y completado cuentan como PAGADO
            case 'pago_confirmado':
            case 'despachado':
            case 'completado':
                return <span className="badge bg-success">Pagado</span>;
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
                                        <th className="text-center" onClick={() => requestSort('monto')} style={{ cursor: 'pointer' }}>
                                            Monto Total {getSortIcon('monto')}
                                        </th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(pedido => (
                                        <tr key={pedido.id}>
                                            <td className="px-4">
                                                <span className="badge bg-success">#{pedido.id}</span>
                                            </td>
                                            <td><strong>{pedido.cliente.nombres} {pedido.cliente.apellidos}</strong></td>
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
                                                <span className="badge bg-light text-dark border">{pedido.items ? pedido.items.length : 0} items</span>
                                            </td>
                                            <td className="text-center fw-bold text-success">
                                                ${parseFloat(pedido.total_cotizacion || 0).toLocaleString('es-CL')}
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
                                                        <>
                                                            <button
                                                                onClick={() => handleRechazarPago(pedido.id)}
                                                                disabled={updatingId === pedido.id}
                                                                className="btn btn-sm btn-danger ms-1"
                                                                title="Rechazar Pago"
                                                            >
                                                                <i className="bi bi-x-lg"></i>
                                                            </button>
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
                                                        </>
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
                                    <p className="mb-1"><strong>Nombre:</strong> {selectedPedido.cliente.nombres} {selectedPedido.cliente.apellidos}</p>
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

                            {/* --- Desglose Financiero --- */}
                            <div className="row justify-content-end mt-3">
                                <div className="col-md-5">
                                    <table className="table table-sm table-borderless text-end">
                                        <tbody>
                                            <tr>
                                                <th className="fw-normal">Subtotal Neto:</th>
                                                <td>
                                                    $ {selectedPedido.items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0).toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                            {selectedPedido.porcentaje_urgencia > 0 && (
                                                <tr>
                                                    <th className="fw-normal">Recargo Urgencia ({selectedPedido.porcentaje_urgencia}%):</th>
                                                    <td>
                                                        $ {Math.round(selectedPedido.items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0) * (selectedPedido.porcentaje_urgencia / 100)).toLocaleString('es-CL')}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr>
                                                <th className="fw-normal">IVA (19%):</th>
                                                <td>
                                                    $ {Math.round(
                                                        (selectedPedido.items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0) * (1 + (selectedPedido.porcentaje_urgencia || 0) / 100)) * 0.19
                                                    ).toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                            {selectedPedido.costo_envio_estimado > 0 && (
                                                <tr>
                                                    <th className="fw-normal">Envío:</th>
                                                    <td>$ {parseInt(selectedPedido.costo_envio_estimado).toLocaleString('es-CL')}</td>
                                                </tr>
                                            )}
                                            <tr className="border-top">
                                                <th className="fs-5">Total a Pagar:</th>
                                                <td className="fs-5 fw-bold text-success">
                                                    $ {parseInt(selectedPedido.total_cotizacion || 0).toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cerrar
                    </Button>
                    {activeTab === 'pendientes' && selectedPedido && (
                        <>
                            <Button
                                variant="danger"
                                className="me-auto"
                                onClick={() => handleRechazarPago(selectedPedido.id)}
                            >
                                Rechazar Pago
                            </Button>
                            <Button
                                variant="success"
                                onClick={() => {
                                    handleCloseModal();
                                    handleConfirmarPago(selectedPedido.id);
                                }}
                            >
                                Confirmar Pago
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PagosPanelPage;