// Formatea un monto en CLP
export const formatCLP = (amount) => {
    // Si el monto es null o undefined, retorna una cadena vacía
    if (amount === null || amount === undefined) return '';
    // Formatea el monto como moneda chilena
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount); // Formatea el monto como moneda chilena
};
