import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PaginationControl from '../../components/common/PaginationControl';

const CotizacionesPanelPage = () => {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [filteredCotizaciones, setFilteredCotizaciones] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' or 'historial'

    const [sortField, setSortField] = useState('fecha_actualizacion');
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };


    const fetchCotizaciones = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            let url = 'http://127.0.0.1:8000/api/pedidos/cotizados/';

            if (activeTab === 'historial') {
                url = 'http://127.0.0.1:8000/api/pedidos/historial-cotizaciones/';
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCotizaciones(response.data);
            setFilteredCotizaciones(response.data);
        } catch (err) {
            console.error("Error al obtener las cotizaciones:", err);
            setError('No se pudieron cargar las cotizaciones.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchCotizaciones();
    }, [fetchCotizaciones]);

    useEffect(() => {
        let filtered = cotizaciones;

        // Filtro por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.id.toString().includes(searchTerm)
            );
        }

        // Filtro por fechas
        if (startDate) {
            filtered = filtered.filter(c => new Date(c.fecha_actualizacion) >= new Date(startDate));
        }
        if (endDate) {
            // Ajustamos endDate para incluir todo el día seleccionado
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(c => new Date(c.fecha_actualizacion) <= end);
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

        setFilteredCotizaciones(filtered);
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, cotizaciones, sortField, sortOrder]);

    const handleCancelar = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas cancelar esta cotización? Pasará al historial como rechazada/cancelada.')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`http://127.0.0.1:8000/api/pedidos/${id}/rechazar/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Actualizar lista
            setCotizaciones(prev => prev.filter(c => c.id !== id));
            setFilteredCotizaciones(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error("Error al cancelar cotización:", err);
            setError('Error al cancelar la cotización.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCotizaciones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="text-center py-5">
                    <div className="spinner-border text-warning" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando cotizaciones...</p>
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <i className="bi bi-file-earmark-text text-warning me-2"></i>
                        {activeTab === 'pendientes' ? 'Cotizaciones Enviadas' : 'Historial de Cotizaciones'}
                    </h2>
                    <p className="text-muted mb-0">
                        {filteredCotizaciones.length} cotización{filteredCotizaciones.length !== 1 ? 'es' : ''} {activeTab === 'pendientes' ? 'pendiente de respuesta' : 'en el historial'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        Pendientes
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'historial' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historial')}
                    >
                        Historial
                    </button>
                </li>
            </ul>

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

            {currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-file-earmark-text fs-1 text-muted d-block mb-3"></i>
                    <h5 className="text-muted">
                        {searchTerm || startDate || endDate ? 'No se encontraron resultados con los filtros aplicados' : 'No hay cotizaciones para mostrar'}
                    </h5>
                </div>
            ) : (
                <>
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
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
                                        <th onClick={() => handleSort('fecha_actualizacion')} style={{ cursor: 'pointer' }}>
                                            Fecha {activeTab === 'pendientes' ? 'Cotizado' : 'Actualización'} {sortField === 'fecha_actualizacion' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                        </th>
                                        {activeTab === 'historial' && (
                                            <th onClick={() => handleSort('estado')} style={{ cursor: 'pointer' }}>
                                                Estado {sortField === 'estado' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                            </th>
                                        )}
                                        <th className="text-center">Items</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(cotizacion => (
                                        <tr key={cotizacion.id}>
                                            <td className="px-4">
                                                <span className="badge bg-warning text-dark">#{cotizacion.id}</span>
                                            </td>
                                            <td><strong>{cotizacion.cliente.nombre} {cotizacion.cliente.apellido}</strong></td>
                                            <td>{cotizacion.cliente.empresa || '-'}</td>
                                            <td>
                                                <small>{new Date(cotizacion.fecha_actualizacion).toLocaleDateString('es-ES')}</small>
                                                <br />
                                                <small className="text-muted">
                                                    {new Date(cotizacion.fecha_actualizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </small>
                                            </td>
                                            {activeTab === 'historial' && (
                                                <td>
                                                    <span className={`badge bg-${cotizacion.estado === 'aceptado' ? 'success' :
                                                        cotizacion.estado === 'rechazado' ? 'danger' :
                                                            cotizacion.estado === 'completado' ? 'primary' :
                                                                'secondary'
                                                        }`}>
                                                        {cotizacion.estado.toUpperCase()}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="text-center">
                                                <span className="badge bg-secondary">{cotizacion.items.length}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Link to={`/panel/cotizacion/${cotizacion.id}`} className="btn btn-sm btn-outline-primary" title="Ver / Editar">
                                                        <i className="bi bi-eye me-1"></i> Ver
                                                    </Link>
                                                    <a
                                                        href={`http://127.0.0.1:8000/api/pedidos/${cotizacion.id}/pdf/`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Generar PDF"
                                                    >
                                                        <i className="bi bi-file-earmark-pdf"></i> PDF
                                                    </a>
                                                    {activeTab === 'pendientes' && (
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleCancelar(cotizacion.id)}
                                                            title="Cancelar Cotización"
                                                        >
                                                            <i className="bi bi-x-circle"></i> Cancelar
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

export default CotizacionesPanelPage;