import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ProductosPanelPage = () => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio_referencia: '',
        categoria: '',
        imagen_url: '',
        activo: true
    });

    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('http://localhost:8000/api/productos-crud/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProductos(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingProduct) {
                await axios.put(`http://localhost:8000/api/productos-crud/${editingProduct.id}/`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:8000/api/productos-crud/', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchProductos();
            closeModal();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este producto?')) {
            const token = localStorage.getItem('accessToken');
            try {
                await axios.delete(`http://localhost:8000/api/productos-crud/${id}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchProductos();
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Error al eliminar el producto');
            }
        }
    };

    const handleSyncProductos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('http://localhost:8000/api/productos-crud/sincronizar/', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(response.data.message);
            fetchProductos();
        } catch (error) {
            console.error('Error syncing products:', error);
            alert('Error al sincronizar productos');
            setLoading(false);
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                nombre: product.nombre,
                descripcion: product.descripcion,
                precio_referencia: product.precio_referencia,
                categoria: product.categoria,
                imagen_url: product.imagen_url || '',
                activo: product.activo
            });
        } else {
            setEditingProduct(null);
            setFormData({
                nombre: '',
                descripcion: '',
                precio_referencia: '',
                categoria: '',
                imagen_url: '',
                activo: true
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Link to="/dashboard" className="text-decoration-none text-muted mb-2 d-block">
                        <i className="bi bi-arrow-left me-1"></i> Volver al Panel
                    </Link>
                    <h2>Gestión de Productos</h2>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-success" onClick={handleSyncProductos}>
                        <i className="bi bi-arrow-repeat me-2"></i>Sincronizar desde Pedidos
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <i className="bi bi-plus-lg me-2"></i>Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Producto</th>
                                    <th>Categoría</th>
                                    <th>Precio Ref.</th>
                                    <th>Estado</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map(product => (
                                    <tr key={product.id}>
                                        <td className="ps-4">
                                            <div className="fw-bold">{product.nombre}</div>
                                            <div className="small text-muted text-truncate" style={{ maxWidth: '250px' }}>{product.descripcion}</div>
                                        </td>
                                        <td><span className="badge bg-light text-dark border">{product.categoria || 'General'}</span></td>
                                        <td>${parseFloat(product.precio_referencia).toLocaleString()}</td>
                                        <td>
                                            {product.activo ?
                                                <span className="badge bg-success bg-opacity-10 text-success">Activo</span> :
                                                <span className="badge bg-danger bg-opacity-10 text-danger">Inactivo</span>
                                            }
                                        </td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openModal(product)}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(product.id)}>
                                                <i className="bi bi-trash"></i>
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
                                <h5 className="modal-title">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Nombre</label>
                                        <input type="text" className="form-control" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Descripción</label>
                                        <textarea className="form-control" name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="2"></textarea>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Precio Referencia</label>
                                            <input type="number" className="form-control" name="precio_referencia" value={formData.precio_referencia} onChange={handleInputChange} />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Categoría</label>
                                            <input type="text" className="form-control" name="categoria" value={formData.categoria} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">URL Imagen</label>
                                        <input type="url" className="form-control" name="imagen_url" value={formData.imagen_url} onChange={handleInputChange} placeholder="https://..." />
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" name="activo" checked={formData.activo} onChange={handleInputChange} />
                                        <label className="form-check-label">Producto Activo</label>
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

export default ProductosPanelPage;
