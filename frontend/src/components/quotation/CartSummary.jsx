import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';

// CartSummary es un componente que muestra la lista de productos agregados al carrito
const CartSummary = () => {
    const { cart, removeItem, updateItem, totalItems } = useCart();
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', details: '', qty: 1 });

    // handleEditClick es una función que se encarga de editar un item del carrito
    const handleEditClick = (item) => {
        setEditingItem(item);
        setEditForm({ name: item.name, details: item.details, qty: item.qty });
    };

    // handleSaveEdit es una función que se encarga de guardar los cambios de un item editado
    const handleSaveEdit = () => {
        if (editingItem) {
            updateItem(editingItem.id, {
                name: editForm.name,
                details: editForm.details,
                qty: parseInt(editForm.qty) || 1
            });
            setEditingItem(null);
        }
    };

    return ( // renderiza el carrito de compras
        <>
            <div className="card shadow-sm border-0" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="card-header bg-dark text-white py-3">
                    <h5 className="mb-0">
                        <i className="bi bi-cart3 me-2"></i>
                        Items a Cotizar
                    </h5>
                    <small className="text-white-50">{totalItems} productos agregados</small>
                </div>
                <div className="card-body p-0">
                    {cart.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-cart-x display-1 mb-3 d-block opacity-25"></i>
                            <p>Lista vacía</p>
                        </div>
                    ) : (
                        <ul className="list-group list-group-flush">
                            {cart.map((item) => (
                                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-start py-3">
                                    <div className="me-auto" style={{ width: '60%' }}>
                                        <div className="fw-bold text-truncate">
                                            {item.name}
                                            {item.source === 'LINK' && <span className="badge bg-info text-dark ms-2" style={{ fontSize: '0.6rem' }}>LINK</span>}
                                            {item.source === 'MANUAL' && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.6rem' }}>MANUAL</span>}
                                            {item.source === 'CATALOGO' && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}>CATÁLOGO</span>}
                                        </div>
                                        <div className="small text-muted text-truncate">
                                            {item.details}
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-light text-dark border me-2 fs-6">
                                            x{item.qty}
                                        </span>
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="btn btn-sm btn-outline-primary border-0 me-1"
                                            title="Editar"
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="btn btn-sm btn-outline-danger border-0"
                                            title="Eliminar"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Custom Modal Overlay */}
            {editingItem && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Editar Item</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setEditingItem(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Producto / Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Detalles / Link</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={editForm.details}
                                        onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Cantidad</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="1"
                                        value={editForm.qty}
                                        onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setEditingItem(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveEdit}
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CartSummary;
