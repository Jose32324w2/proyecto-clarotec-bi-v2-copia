import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';

const ManualInput = () => {
    const [name, setName] = useState('');
    const [model, setModel] = useState('');
    const [qty, setQty] = useState(1);
    const { addItem } = useCart();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name) return;

        addItem({
            id: Date.now(),
            source: 'MANUAL',
            name: name,
            details: model || 'Sin modelo especificado',
            qty: parseInt(qty),
            referencia: model
        });

        setName('');
        setModel('');
        setQty(1);
    };

    return (
        <div className="card mb-4">
            <div className="card-header bg-white">
                <h5 className="mb-0 text-warning">
                    <i className="bi bi-pencil me-2"></i>
                    Opción 2: Escribir Producto Manualmente
                </h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit} className="row g-2 align-items-end">
                    <div className="col-md-5">
                        <label className="form-label small text-muted mb-1">PRODUCTO</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Ej: Caja Tornillos 1 pulgada"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="col-md-5">
                        <label className="form-label small text-muted mb-1">MODELO / MARCA (OPCIONAL)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Ej: Makita / Bosch"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                        />
                    </div>
                    <div className="col-md-1">
                        <label className="form-label small text-muted mb-1">CANT.</label>
                        <input
                            type="number"
                            className="form-control text-center"
                            value={qty}
                            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                        />
                    </div>
                    <div className="col-md-1">
                        <button type="submit" className="btn btn-success w-100">
                            +
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualInput;
