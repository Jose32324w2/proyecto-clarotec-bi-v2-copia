import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('clarotec_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('clarotec_cart', JSON.stringify(cart));
    }, [cart]);

    const addItem = (item) => {
        setCart(prevCart => {
            // Check if item already exists (especially for catalog items)
            const existingItemIndex = prevCart.findIndex(
                i => i.source === 'CATALOGO' && i.original_id === item.original_id && item.source === 'CATALOGO'
            );

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].qty += item.qty;
                return newCart;
            }

            // For links and manual, we just add them as new items for now (simplification)
            return [...prevCart, item];
        });
    };

    const removeItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const updateItem = (id, updates) => {
        setCart(prevCart => prevCart.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
    };

    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

    return (
        <CartContext.Provider value={{ cart, addItem, removeItem, updateItem, clearCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
};
