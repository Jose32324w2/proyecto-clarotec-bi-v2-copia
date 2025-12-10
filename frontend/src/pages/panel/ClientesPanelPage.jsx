import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ClientesPanelPage = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        empresa: '',
        telefono: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, registered, guest
    const [sortField, setSortField] = useState('nombre');
    const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredClientes = clientes
        .filter(client => {
            // Search Filter
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                client.nombre?.toLowerCase().includes(term) ||
                client.apellido?.toLowerCase().includes(term) ||
                client.email?.toLowerCase().includes(term) ||
                client.empresa?.toLowerCase().includes(term);

            // Status Filter
            let matchesStatus = true;
            if (filterStatus === 'registered') matchesStatus = client.es_usuario_registrado;
            if (filterStatus === 'guest') matchesStatus = !client.es_usuario_registrado;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('http://localhost:8000/api/clientes-crud/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClientes(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingClient) {
                await axios.put(`http://localhost:8000/api/clientes-crud/${editingClient.id}/`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchClientes();
            closeModal();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error al guardar el cliente');
        }
    };

    const openModal = (client) => {
        setEditingClient(client);
        setFormData({
            nombre: client.nombre,
            apellido: client.apellido,
            email: client.email,
            empresa: client.empresa || '',
            telefono: client.telefono || ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClient(null);
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Link to="/dashboard" className="text-decoration-none text-muted mb-2 d-block">
                        <i className="bi bi-arrow-left me-1"></i> Volver al Panel
                    </Link>
                    <h2>Gestión de Clientes</h2>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="p-3 bg-light border-bottom d-flex gap-3 align-items-center">
                        <div className="flex-grow-1">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="Buscar por nombre, email o empresa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="d-flex align-items-center">
                            <i className="bi bi-funnel text-muted me-2"></i>
                            <select
                                className="form-select form-select-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ width: '150px' }}
                            >
                                <option value="all">Todos</option>
                                <option value="registered">Registrados</option>
                                <option value="guest">Invitados</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 clickable" onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                                        Nombre {sortField === 'nombre' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                    </th>
                                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                                        Email {sortField === 'email' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                    </th>
                                    <th onClick={() => handleSort('empresa')} style={{ cursor: 'pointer' }}>
                                        Empresa {sortField === 'empresa' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                    </th>
                                    <th>Teléfono</th>
                                    <th className="text-center" onClick={() => handleSort('es_usuario_registrado')} style={{ cursor: 'pointer' }}>
                                        Estado {sortField === 'es_usuario_registrado' && (sortOrder === 'asc' ? <i className="bi bi-caret-up-fill small"></i> : <i className="bi bi-caret-down-fill small"></i>)}
                                    </th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClientes.map(client => (
                                    <tr key={client.id}>
                                        <td className="ps-4 fw-bold">{client.nombre} {client.apellido}</td>
                                        <td>{client.email}</td>
                                        <td>{client.empresa || '-'}</td>
                                        <td>{client.telefono || '-'}</td>
                                        <td className="text-center">
                                            {client.es_usuario_registrado ? (
                                                <span className="badge bg-success rounded-pill">
                                                    <i className="bi bi-check-circle me-1"></i>Registrado
                                                </span>
                                            ) : (
                                                <span className="badge bg-warning text-dark rounded-pill">
                                                    <i className="bi bi-person-dash me-1"></i>Invitado
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => openModal(client)}>
                                                <i className="bi bi-pencil"></i> Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClientes.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5 text-muted">
                                            <i className="bi bi-search display-6 d-block mb-3"></i>
                                            No se encontraron clientes con los filtros actuales.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Editar Cliente</h5>
                                    <button type="button" className="btn-close" onClick={closeModal}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label">Nombre</label>
                                            <input type="text" className="form-control" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Apellido</label>
                                            <input type="text" className="form-control" name="apellido" value={formData.apellido} onChange={handleInputChange} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Email</label>
                                            <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Empresa</label>
                                            <input type="text" className="form-control" name="empresa" value={formData.empresa} onChange={handleInputChange} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Teléfono</label>
                                            <input type="text" className="form-control" name="telefono" value={formData.telefono} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Guardar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
                }
            </div >
        </div >
    );
};

export default ClientesPanelPage;
