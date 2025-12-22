import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';

// LinkInput es un componente que permite agregar productos externos al carrito
const LinkInput = () => {
    const [url, setUrl] = useState('');
    const [qty, setQty] = useState(1);
    const { addItem } = useCart();

    // handleSubmit es una función que se encarga de agregar un producto externo al carrito
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!url) return;

        addItem({
            id: Date.now(),
            source: 'LINK',
            name: 'Producto Externo (Link)',
            details: url,
            qty: parseInt(qty),
            referencia: url
        });

        setUrl('');
        setQty(1);
    };

    return ( // renderiza el formulario para agregar un producto externo al carrito
        <div className="card mb-4">
            <div className="card-header bg-white">
                <h5 className="mb-0 text-primary">
                    <i className="bi bi-link-45deg me-2"></i>
                    Opción 1: Pegar Link (Sodimac, Easy, etc.)
                </h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit} className="d-flex gap-2 align-items-end">
                    <div className="flex-grow-1">
                        <input
                            type="url"
                            className="form-control"
                            placeholder="https://..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ width: '100px' }}>
                        <label className="form-label small text-muted mb-1">CANTIDAD</label>
                        <input
                            type="number"
                            className="form-control text-center"
                            value={qty}
                            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                        />
                    </div>
                    <button type="submit" className="btn btn-dark px-4">
                        Agregar +
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LinkInput;
