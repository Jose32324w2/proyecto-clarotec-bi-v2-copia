
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';

// CatalogCard es un componente que muestra un producto del catálogo
const CatalogCard = ({ product }) => {
    const [qty, setQty] = useState(1);
    const { addItem } = useCart();

    // handleAdd es una función que se encarga de agregar un producto al carrito
    const handleAdd = () => {
        addItem({
            id: Date.now(), // Unique ID for the cart item
            original_id: product.id, // ID from DB
            source: 'CATALOGO',
            name: product.nombre,
            details: product.categoria || 'Catálogo',
            qty: parseInt(qty),
            referencia: ''
        });
        setQty(1);
    };

    return ( // renderiza el producto del catálogo
        <div className="card h-100 shadow-sm">
            <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted small text-uppercase">{product.categoria}</h6>
                <h5 className="card-title text-truncate" title={product.nombre}>{product.nombre}</h5>
                {product.imagen_url && (
                    <div className="text-center my-3">
                        <img src={product.imagen_url} alt={product.nombre} style={{ maxHeight: '100px', objectFit: 'contain' }} />
                    </div>
                )}
                <div className="d-flex gap-2 mt-3">
                    <input
                        type="number"
                        className="form-control text-center"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        style={{ width: '70px' }}
                    />
                    <button onClick={handleAdd} className="btn btn-dark flex-grow-1">
                        <i className="bi bi-plus-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CatalogCard;
