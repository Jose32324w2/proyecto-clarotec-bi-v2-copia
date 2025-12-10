import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import PaginationControl from '../../components/common/PaginationControl';

const SolicitudesPanelPage = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Filtros de fecha
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);

    const [sortField, setSortField] = useState('fecha_solicitud');
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const itemsPerPage = 10;

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const fetchSolicitudes = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('No autorizado. Por favor, inicie sesión.');
                setLoading(false);
                return;
            }

            const response = await axios.get('http://127.0.0.1:8000/api/pedidos/solicitudes/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setSolicitudes(response.data);
            setFilteredSolicitudes(response.data);
        } catch (err) {
            console.error("Error al obtener las solicitudes:", err);
            setError('No se pudieron cargar las solicitudes. Intente de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const filterSolicitudes = React.useCallback(() => {
        let filtered = solicitudes;

        // Filtro por término de búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.cliente.nombre.toLowerCase().includes(term) ||
                s.cliente.apellido.toLowerCase().includes(term) ||
                s.cliente.empresa.toLowerCase().includes(term) ||
                s.cliente.email.toLowerCase().includes(term) ||
                s.id.toString().includes(term)
            );
        }

        // Filtro por fecha
        if (startDate) {
            filtered = filtered.filter(s => new Date(s.fecha_solicitud) >= new Date(startDate));
        }
        if (endDate) {
            // Ajustamos endDate para que incluya todo el día seleccionado
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(s => new Date(s.fecha_solicitud) <= end);
        }

        // Ordenamiento
        filtered.sort((a, b) => {
            let valA, valB;

            // Mapeo seguro de campos anidados
            if (sortField === 'cliente.nombre') {
                valA = `${a.cliente?.nombre || ''} ${a.cliente?.apellido || ''}`;
                valB = `${b.cliente?.nombre || ''} ${b.cliente?.apellido || ''}`;
            } else if (sortField === 'cliente.empresa') {
                valA = a.cliente?.empresa || '';
                valB = b.cliente?.empresa || '';
            } else if (sortField === 'cliente.email') {
                valA = a.cliente?.email || '';
                valB = b.cliente?.email || '';
            } else {
                valA = a[sortField];
                valB = b[sortField];
            }

            // Normalización para strings
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredSolicitudes(filtered);
        setCurrentPage(1);
    }, [solicitudes, searchTerm, startDate, endDate, sortField, sortOrder]);

    useEffect(() => {
        filterSolicitudes();
    }, [filterSolicitudes]);

    const handleRechazar = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas rechazar esta solicitud? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`http://127.0.0.1:8000/api/pedidos/${id}/rechazar/`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // Eliminar de la lista local
            setSolicitudes(prev => prev.filter(s => s.id !== id));
            setFilteredSolicitudes(prev => prev.filter(s => s.id !== id));
            // Opcional: Mostrar toast de éxito
        } catch (err) {
            console.error("Error al rechazar solicitud:", err);
            setError('Error al rechazar la solicitud.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleShowModal = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSolicitud(null);
    };

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSolicitudes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSolicitudes.length / itemsPerPage);

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Header con búsqueda y filtros */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1">
                        <i className="bi bi-inbox text-primary me-2"></i>
                        Solicitudes de Cotización
                    </h2>
                    <p className="text-muted mb-0">
                        {filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? 'es' : ''} pendiente{filteredSolicitudes.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="d-flex flex-column flex-md-row gap-2">
                    {/* Filtros de Fecha */}
                    <div className="input-group">
                        <span className="input-group-text bg-white text-muted">Desde</span>
                        <input
                            type="date"
                            className="form-control"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <span className="input-group-text bg-white text-muted">Hasta</span>
                        <input
                            type="date"
                            className="form-control"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Buscador */}
                    <div className="input-group" style={{ minWidth: '250px' }}>
                        <span className="input-group-text bg-white">
                            <i className="bi bi-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setSearchTerm('')}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla o estado vacío */}
            {currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                    <h5 className="text-muted">
                        {searchTerm || startDate || endDate ? 'No se encontraron resultados con los filtros aplicados' : 'No hay solicitudes pendientes'}
                    </h5>
                    {(searchTerm || startDate || endDate) && (
                        <button
                            className="btn btn-link text-decoration-none"
                            onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-4" onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                                            ID {sortField === 'id' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        <th onClick={() => handleSort('cliente.nombre')} style={{ cursor: 'pointer' }}>
                                            Cliente {sortField === 'cliente.nombre' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        <th onClick={() => handleSort('cliente.empresa')} style={{ cursor: 'pointer' }}>
                                            Empresa {sortField === 'cliente.empresa' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        <th onClick={() => handleSort('cliente.email')} style={{ cursor: 'pointer' }}>
                                            Email {sortField === 'cliente.email' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        <th onClick={() => handleSort('fecha_solicitud')} style={{ cursor: 'pointer' }}>
                                            Fecha {sortField === 'fecha_solicitud' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        <th className="text-center">Items</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(solicitud => (
                                        <tr key={solicitud.id}>
                                            <td className="px-4">
                                                <span className="badge bg-primary">#{solicitud.id}</span>
                                            </td>
                                            <td>
                                                <strong>{solicitud.cliente.nombre} {solicitud.cliente.apellido}</strong>
                                            </td>
                                            <td>{solicitud.cliente.empresa || '-'}</td>
                                            <td>
                                                <small className="text-muted">{solicitud.cliente.email}</small>
                                            </td>
                                            <td>
                                                <small>{new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}</small>
                                                <br />
                                                <small className="text-muted">
                                                    {new Date(solicitud.fecha_solicitud).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </small>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary">{solicitud.items.length}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleShowModal(solicitud)}
                                                        title="Ver detalles"
                                                    >
                                                        <i className="bi bi-eye"></i> Ver
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleRechazar(solicitud.id)}
                                                        title="Rechazar Solicitud"
                                                    >
                                                        <i className="bi bi-x-lg"></i>
                                                    </button>
                                                    <Link
                                                        to={`/panel/cotizacion/${solicitud.id}`}
                                                        className="btn btn-sm btn-primary"
                                                        title="Cotizar ahora"
                                                    >
                                                        <i className="bi bi-pencil-square me-1"></i>
                                                        Cotizar
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Paginación */}
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
                    <Modal.Title>Detalles de Solicitud #{selectedSolicitud?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedSolicitud && (
                        <div>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Información del Cliente</h6>
                                    <p className="mb-1"><strong>Nombre:</strong> {selectedSolicitud.cliente.nombre} {selectedSolicitud.cliente.apellido}</p>
                                    <p className="mb-1"><strong>Empresa:</strong> {selectedSolicitud.cliente.empresa || 'N/A'}</p>
                                    <p className="mb-1"><strong>Email:</strong> {selectedSolicitud.cliente.email}</p>
                                    <p className="mb-0"><strong>Teléfono:</strong> {selectedSolicitud.cliente.telefono || 'N/A'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-muted mb-2">Información de Solicitud</h6>
                                    <p className="mb-1"><strong>Fecha:</strong> {new Date(selectedSolicitud.fecha_solicitud).toLocaleString()}</p>
                                    <p className="mb-0"><strong>Estado:</strong> <span className="badge bg-warning text-dark">{selectedSolicitud.estado}</span></p>
                                </div>
                            </div>

                            <h6 className="text-muted mb-3">Items Solicitados</h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Descripción</th>
                                            <th className="text-center" style={{ width: '100px' }}>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSolicitud.items.map((item, index) => (
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
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cerrar
                    </Button>
                    <Link
                        to={`/panel/cotizacion/${selectedSolicitud?.id}`}
                        className="btn btn-primary"
                        onClick={handleCloseModal}
                    >
                        Proceder a Cotizar
                    </Link>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SolicitudesPanelPage;