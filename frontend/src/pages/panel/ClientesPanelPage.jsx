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
        email: '',
        empresa: '',
        telefono: ''
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
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Nombre</th>
                                    <th>Email</th>
                                    <th>Empresa</th>
                                    <th>Teléfono</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map(client => (
                                    <tr key={client.id}>
                                        <td className="ps-4 fw-bold">{client.nombre}</td>
                                        <td>{client.email}</td>
                                        <td>{client.empresa || '-'}</td>
                                        <td>{client.telefono || '-'}</td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => openModal(client)}>
                                                <i className="bi bi-pencil"></i> Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
            )}
        </div>
    );
};

export default ClientesPanelPage;
