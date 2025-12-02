import React from 'react';

const CurrencyInput = ({ value, onChange, className, placeholder, ...props }) => {
    // Función para formatear el valor con puntos
    const formatNumber = (num) => {
        if (num === '' || num === undefined || num === null) return '';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // Función para limpiar el valor (quitar puntos)
    const cleanNumber = (str) => {
        return str.replace(/\./g, '');
    };

    const handleChange = (e) => {
        const rawValue = e.target.value;
        const cleanValue = cleanNumber(rawValue);

        // Solo permitir números
        if (!/^\d*$/.test(cleanValue)) return;

        // Llamar al onChange con el valor numérico limpio
        onChange(cleanValue);
    };

    return (
        <input
            type="text"
            className={className}
            placeholder={placeholder}
            value={formatNumber(value)}
            onChange={handleChange}
            {...props}
        />
    );
};

export default CurrencyInput;
