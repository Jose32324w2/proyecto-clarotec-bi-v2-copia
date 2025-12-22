// CartContext.jsx
// Contexto del Carrito de Compras.
// 
// PROPÓSITO:
// - Gestiona el estado temporal de los productos seleccionados por el cliente.
// - Persiste los datos en localStorage para no perder el carrito al refrescar.
// - Provee métodos: addItem, removeItem, updateItem, clearCart.

import React, { createContext, useState, useContext, useEffect } from 'react';

// CartContext es un contexto que provee acceso global al carrito de compras
const CartContext = createContext();

// useCart es un hook que permite acceder al contexto de carrito desde cualquier componente
export const useCart = () => useContext(CartContext);

// CartProvider es un componente que provee el contexto de carrito a toda la app
export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('clarotec_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // useEffect se encarga de guardar el carrito en localStorage cada vez que cambia
    useEffect(() => {
        localStorage.setItem('clarotec_cart', JSON.stringify(cart));
    }, [cart]);

    // addItem es una función que agrega un item al carrito
    const addItem = (item) => {
        setCart(prevCart => {
            // Busca el item en el carrito
            const existingItemIndex = prevCart.findIndex(
                i => i.source === 'CATALOGO' && i.original_id === item.original_id && item.source === 'CATALOGO'
            );

            // Si el item ya existe, actualiza la cantidad
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].qty += item.qty;
                return newCart;
            }

            // Agrega el item al carrito
            return [...prevCart, item];
        });
    };

    // removeItem es una función que elimina un item del carrito
    const removeItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    // updateItem es una función que actualiza un item del carrito
    const updateItem = (id, updates) => {
        setCart(prevCart => prevCart.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    };

    // clearCart es una función que vacía el carrito
    const clearCart = () => {
        setCart([]);
    };

    // totalItems es una función que calcula el total de items en el carrito
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

    return ( // CartContext.Provider provee el contexto de carrito a toda la app 
        <CartContext.Provider value={{ cart, addItem, removeItem, updateItem, clearCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
};
