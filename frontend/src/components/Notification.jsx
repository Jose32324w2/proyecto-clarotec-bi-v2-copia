// frontend/src/components/Notification.jsx
import React, { useEffect } from 'react';

const notificationStyles = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 2rem',
    borderRadius: '5px',
    color: 'white',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};
const successStyles = { ...notificationStyles, backgroundColor: '#28a745' };
const errorStyles = { ...notificationStyles, backgroundColor: '#dc3545' };

const Notification = ({ message, type, onClear }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClear();
            }, 3000); // La notificación desaparece después de 3 segundos
            return () => clearTimeout(timer);
        }
    }, [message, onClear]);

    if (!message) return null;

    return (
        <div style={type === 'success' ? successStyles : errorStyles}>
            {message}
        </div>
    );
};

export default Notification;