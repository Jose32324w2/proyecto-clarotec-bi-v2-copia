/**
 * Portal de Seguimiento de Pedidos (Cliente).
 * 
 * PROPÓSITO:
 * - Vista pública (protegida por UUID) para que el cliente vea el estado de su pedido.
 * - Muestra línea de tiempo, detalles de productos y link de tracking de envío.
 * - Permite subir comprobantes de pago.
 */
// frontend/src/pages/PortalPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatCLP } from '../utils/formatters';

const COURIERS_LABELS = {
    'STARKEN': 'Starken',
    'CHILEXPRESS': 'Chilexpress',
    'BLUE': 'Blue Express',
    'OTRO': 'Otro / Transporte Propio'
};

const PortalPage = () => {
    const { id_seguimiento } = useParams(); // Obtiene el UUID de la URL
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionInProgress, setActionInProgress] = useState(false);

    // Estado para la selección de envío
    const [selectedShippingMethod, setSelectedShippingMethod] = useState('');
    const [selectedShippingCost, setSelectedShippingCost] = useState(0);

    useEffect(() => {
        const fetchPedido = async () => {
            if (!id_seguimiento) return;
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/portal/pedidos/${id_seguimiento}/`);
                setPedido(response.data);

                // Inicializar selección si ya existe
                if (response.data.metodo_envio) {
                    setSelectedShippingMethod(response.data.metodo_envio);
                    setSelectedShippingCost(parseFloat(response.data.costo_envio_estimado || 0));
                }
            } catch (err) {
                console.error("Error al obtener el pedido:", err);
                setError('No pudimos encontrar tu cotización. Por favor, verifica el enlace.');
            } finally {
                setLoading(false);
            }
        };
        fetchPedido();
    }, [id_seguimiento]);

    const handleSelectShipping = async (method, cost) => {
        setSelectedShippingMethod(method);
        setSelectedShippingCost(parseFloat(cost));

        // Opcional: Guardar selección inmediatamente o esperar a que acepte.
        // Vamos a guardarlo inmediatamente para que persista si recarga.
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/portal/pedidos/${id_seguimiento}/seleccionar-envio/`, {
                metodo_envio: method,
                costo: cost
            });
            // Actualizamos el pedido localmente también para reflejar cambios si es necesario
            setPedido(prev => ({ ...prev, metodo_envio: method, costo_envio_estimado: cost }));
        } catch (err) {
            console.error("Error al guardar selección de envío:", err);
            alert("Hubo un problema al guardar tu selección de envío.");
        }
    };

    const handleAction = async (accion) => {
        if (accion === 'aceptar' && !selectedShippingMethod && pedido.opciones_envio && Object.keys(pedido.opciones_envio).length > 0) {
            alert("Por favor, selecciona un método de envío antes de aceptar.");
            return;
        }

        setActionInProgress(true);
        setError('');
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/portal/pedidos/${id_seguimiento}/accion/`, { accion });
            // response.data solo trae { status: ... }, no el objeto completo.
            // Actualizamos el estado localmente.
            setPedido(prev => ({ ...prev, estado: accion === 'aceptar' ? 'aceptado' : 'rechazado' }));
            alert(`¡Gracias! Hemos registrado tu respuesta como "${accion === 'aceptar' ? 'Aceptada' : 'Rechazada'}".`);
        } catch (err) {
            console.error(`Error al ${accion} la cotización:`, err.response?.data?.error || err.message);
            setError(err.response?.data?.error || `No se pudo procesar tu respuesta. Por favor, contacta a tu vendedor.`);
        } finally {
            setActionInProgress(false);
        }
    };

    const handleConfirmarRecepcion = async () => {
        if (!window.confirm("¿Confirmas que has recibido todos los productos de este pedido?")) {
            return;
        }
        setActionInProgress(true);
        setError('');
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/portal/pedidos/${id_seguimiento}/confirmar-recepcion/`);
            // Actualizamos solo el estado localmente, ya que la respuesta solo trae { status: ... }
            setPedido(prev => ({ ...prev, estado: 'completado' }));
            alert("¡Gracias por tu confirmación! Hemos cerrado el pedido.");
        } catch (err) {
            console.error("Error al confirmar la recepción:", err.response?.data?.error || err.message);
            setError(err.response?.data?.error || "No se pudo procesar tu confirmación.");
        } finally {
            setActionInProgress(false);
        }
    };

    const handleDownloadPDF = () => {
        window.open(`${process.env.REACT_APP_API_URL}/pedidos/${pedido.id}/pdf/`, '_blank');
    };

    // --- Lógica de cálculo de totales ---
    const subtotalItems = (pedido && pedido.items) ? pedido.items.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio_unitario || 0)), 0) : 0;

    const recargoUrgencia = pedido ? (subtotalItems * (parseFloat(pedido.porcentaje_urgencia || 0) / 100)) : 0;

    // Cálculo de IVA (19%)
    const neto = subtotalItems + recargoUrgencia;
    const iva = neto * 0.19;

    // Usamos el costo seleccionado si existe, sino el del pedido
    const costoEnvio = selectedShippingCost;
    const totalCotizacion = neto + iva + costoEnvio;

    if (loading) return <div style={styles.container}><h1>Cargando tu cotización...</h1></div>;
    if (error) return <div style={{ ...styles.container, color: 'red' }}><h1>Error</h1><p>{error}</p></div>;
    if (!pedido) return <div style={styles.container}><h1>Cotización no encontrada.</h1></div>;

    // --- LÓGICA DE ESTADOS ---
    const showActionButtons = pedido.estado === 'cotizado';
    const showPendingPaymentMessage = pedido.estado === 'aceptado';
    const showPaidMessage = pedido.estado === 'pago_confirmado';
    const showTrackingInfo = pedido.estado === 'despachado' || pedido.estado === 'completado';
    const showConfirmButton = pedido.estado === 'despachado';
    const showCompletedMessage = pedido.estado === 'completado';
    const showRejectedMessage = pedido.estado === 'rechazado';

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Detalle de tu Pedido</h1>
                        <p><strong>Número de Pedido:</strong> {pedido.id}</p>
                        <p><strong>Estado Actual:</strong> <span style={styles.statusBadge}>{pedido.estado.replace('_', ' ').toUpperCase()}</span></p>
                    </div>
                    <button onClick={handleDownloadPDF} style={styles.pdfButton}>
                        <i className="bi bi-file-earmark-pdf"></i> Descargar PDF
                    </button>
                </div>
            </div>

            <h3>Ítems</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Descripción</th>
                        <th style={styles.th}>Cantidad</th>
                        <th style={styles.th}>Precio Unitario</th>
                        <th style={styles.th}>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {pedido.items && pedido.items.map(item => (
                        <tr key={item.id}>
                            <td style={styles.td}>{item.descripcion}</td>
                            <td style={styles.td}>{item.cantidad}</td>
                            <td style={styles.td}>{formatCLP(item.precio_unitario)}</td>
                            <td style={styles.td}>{formatCLP(item.cantidad * item.precio_unitario)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* SELECCIÓN DE ENVÍO (Solo visible si está cotizado y hay opciones) */}
            {showActionButtons && pedido.opciones_envio && Object.keys(pedido.opciones_envio).length > 0 && (
                <div style={styles.shippingContainer}>
                    <h3>Selecciona tu método de envío:</h3>
                    <div style={styles.shippingOptions}>
                        {Object.entries(pedido.opciones_envio).map(([method, cost]) => (
                            <label key={method} style={{
                                ...styles.shippingOption,
                                ...(selectedShippingMethod === method ? styles.shippingOptionSelected : {})
                            }}>
                                <input
                                    type="radio"
                                    name="shippingMethod"
                                    value={method}
                                    checked={selectedShippingMethod === method}
                                    onChange={() => handleSelectShipping(method, cost)}
                                    style={{ marginRight: '10px' }}
                                />
                                <div>
                                    <strong>{COURIERS_LABELS[method] || method}</strong>
                                    <div style={{ color: '#007bff', fontWeight: 'bold' }}>{formatCLP(cost)}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {showTrackingInfo && (
                <div style={styles.trackingContainer}>
                    <h3><i className="bi bi-truck"></i> Información de Despacho</h3>
                    <p><strong>Transportista:</strong> {pedido.transportista}</p>
                    <p><strong>Número de Guía / Seguimiento:</strong> {pedido.numero_guia}</p>
                </div>
            )}

            <div style={styles.totalsContainer}>
                <p><strong>Subtotal Ítems:</strong> {formatCLP(subtotalItems)}</p>
                {recargoUrgencia > 0 && (
                    <p><strong>Recargo por Urgencia ({pedido.porcentaje_urgencia}%):</strong> {formatCLP(recargoUrgencia)}</p>
                )}
                <p><strong>Neto:</strong> {formatCLP(neto)}</p>
                <p><strong>IVA (19%):</strong> {formatCLP(iva)}</p>
                <p><strong>Costo de Envío:</strong> {formatCLP(costoEnvio)}</p>
                <h3 style={styles.totalAmount}>TOTAL: {formatCLP(totalCotizacion)}</h3>
            </div>

            {/* --- SECCIONES DINÁMICAS SEGÚN ESTADO --- */}

            {/* 1. COTIZADO: Botones de Aceptar/Rechazar */}
            {showActionButtons && (
                <div style={styles.actionsContainer}>
                    <p>¿Deseas proceder con esta cotización?</p>
                    <button onClick={() => handleAction('rechazar')} disabled={actionInProgress} style={{ ...styles.button, ...styles.rejectButton }}>
                        Rechazar
                    </button>
                    <button onClick={() => handleAction('aceptar')} disabled={actionInProgress} style={{ ...styles.button, ...styles.acceptButton }}>
                        {actionInProgress ? 'Procesando...' : 'Aceptar y Proceder con el Pago'}
                    </button>
                </div>
            )}

            {/* 2. ACEPTADO: Mensaje de espera de pago */}
            {showPendingPaymentMessage && (
                <div style={styles.infoMessage}>
                    <h4><i className="bi bi-hourglass-split"></i> ¡Gracias por aceptar!</h4>
                    <p>Tu pedido ha sido confirmado. Estamos procesando la información de pago. Te contactaremos pronto.</p>
                </div>
            )}

            {/* 3. PAGO CONFIRMADO: Mensaje de preparación */}
            {showPaidMessage && (
                <div style={styles.successMessage}>
                    <h4><i className="bi bi-check-circle"></i> Pago Recibido</h4>
                    <p>Hemos confirmado tu pago. Tu pedido se está preparando para el despacho.</p>
                </div>
            )}

            {/* 4. DESPACHADO: Botón de confirmar recepción */}
            {showConfirmButton && (
                <div style={styles.actionsContainer}>
                    <p>Tu pedido ha sido despachado. Por favor, confirma la recepción una vez que lo recibas.</p>
                    <button onClick={handleConfirmarRecepcion} disabled={actionInProgress} style={{ ...styles.button, ...styles.acceptButton }}>
                        {actionInProgress ? 'Procesando...' : 'Confirmar Recepción del Producto'}
                    </button>
                </div>
            )}

            {/* 5. COMPLETADO: Mensaje final */}
            {showCompletedMessage && (
                <div style={styles.successMessage}>
                    <h4><i className="bi bi-star-fill"></i> ¡Pedido Completado!</h4>
                    <p>Gracias por confiar en Clarotec. El proceso ha finalizado exitosamente.</p>
                </div>
            )}

            {/* 6. RECHAZADO: Mensaje de rechazo */}
            {showRejectedMessage && (
                <div style={styles.errorMessage}>
                    <h4>Cotización Rechazada</h4>
                    <p>Has rechazado esta cotización. Si cambias de opinión, por favor contacta a tu vendedor.</p>
                </div>
            )}
        </div>
    );
};

// --- Estilos actualizados ---
const styles = {
    container: { maxWidth: '900px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    header: { borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' },
    statusBadge: { backgroundColor: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '15px', fontSize: '0.9em' },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' },
    th: { padding: '12px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' },
    td: { padding: '12px', border: '1px solid #ddd', textAlign: 'left' },
    totalsContainer: { textAlign: 'right', borderTop: '2px solid #333', paddingTop: '1rem' },
    totalAmount: { fontSize: '1.5em', color: '#333' },
    actionsContainer: { textAlign: 'center', marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '2rem' },
    button: { padding: '1rem 2rem', fontSize: '1.1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '1rem' },
    acceptButton: { backgroundColor: '#28a745', color: 'white' },
    rejectButton: { backgroundColor: '#dc3545', color: 'white' },
    pdfButton: { backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    trackingContainer: { marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' },
    infoMessage: { textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#e2e3e5', borderRadius: '5px', color: '#383d41' },
    successMessage: { textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#d4edda', borderRadius: '5px', color: '#155724' },
    errorMessage: { textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#f8d7da', borderRadius: '5px', color: '#721c24' },
    shippingContainer: { marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce5ff' },
    shippingOptions: { display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' },
    shippingOption: { display: 'flex', alignItems: 'center', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', backgroundColor: 'white', flex: '1 1 200px' },
    shippingOptionSelected: { borderColor: '#007bff', backgroundColor: '#e7f1ff', boxShadow: '0 0 5px rgba(0,123,255,0.3)' }
};

export default PortalPage;