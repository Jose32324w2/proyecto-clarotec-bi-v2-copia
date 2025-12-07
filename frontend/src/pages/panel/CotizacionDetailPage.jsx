// frontend/src/pages/panel/CotizacionDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../../components/Notification';
import { REGIONES_Y_COMUNAS } from '../../data/locations';
import { formatCLP } from '../../utils/formatters';
import CurrencyInput from '../../components/common/CurrencyInput';

// COURIERS ya no se usa para selección única, sino para mostrar opciones
const COURIERS_LABELS = {
    'STARKEN': 'Starken',
    'CHILEXPRESS': 'Chilexpress',
    'BLUE': 'Blue Express',
    'OTRO': 'Otro / Transporte Propio'
};

const CotizacionDetailPage = () => {
    const { pedidoId } = useParams();
    const navigate = useNavigate();
    const [sendingEmail, setSendingEmail] = useState(false);
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [calculatingShipment, setCalculatingShipment] = useState(false);

    // Estados para la calculadora de envíos
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [comunasDisponibles, setComunasDisponibles] = useState([]);
    const [customTransport, setCustomTransport] = useState('');

    // Nuevo estado para guardar las opciones calculadas
    const [shippingOptions, setShippingOptions] = useState({});

    // Estado para Margen Global (Automatización de Precios)
    const [globalMargin, setGlobalMargin] = useState('');

    useEffect(() => {
        const fetchPedido = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const response = await axios.get(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPedido(response.data);

                if (response.data.region) {
                    setRegion(response.data.region);
                    // Cargar comunas de esa región
                    const regionData = REGIONES_Y_COMUNAS.find(r => r.region === response.data.region);
                    if (regionData) {
                        setComunasDisponibles(regionData.comunas);
                    }
                }
                if (response.data.comuna) setComuna(response.data.comuna);
                if (response.data.nombre_transporte_custom) setCustomTransport(response.data.nombre_transporte_custom);
                if (response.data.opciones_envio) setShippingOptions(response.data.opciones_envio);

            } catch (err) {
                console.error("Error al obtener el pedido:", err);
                setError('No se pudo cargar la información del pedido.');
            } finally {
                setLoading(false);
            }
        };
        fetchPedido();
    }, [pedidoId]);

    const handleRegionChange = (e) => {
        const selectedRegion = e.target.value;
        setRegion(selectedRegion);
        setComuna(''); // Reset comuna

        const regionData = REGIONES_Y_COMUNAS.find(r => r.region === selectedRegion);
        setComunasDisponibles(regionData ? regionData.comunas : []);
    };

    const handleItemChange = (itemId, field, value) => {
        setPedido(prevPedido => ({
            ...prevPedido,
            items: prevPedido.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handlePedidoChange = (field, value) => {
        setPedido(prevPedido => ({
            ...prevPedido,
            [field]: value
        }));
    };

    // Función para manejar el cambio de Margen Global
    const handleGlobalMarginChange = (e) => {
        const marginValue = e.target.value;
        setGlobalMargin(marginValue);

        const margin = parseFloat(marginValue);

        if (!isNaN(margin) && pedido) {
            // Validación para evitar división por cero o márgenes imposibles (>= 100%)
            if (margin >= 100) {
                return; // No hacer nada si el margen es 100% o más (precio infinito)
            }

            setPedido(prevPedido => ({
                ...prevPedido,
                items: prevPedido.items.map(item => {
                    const cost = parseFloat(item.precio_compra) || 0;

                    // Fórmula Margen Objetivo (Gross Margin): Costo / (1 - Margen/100)
                    // Ejemplo: Costo 5000 / (1 - 0.20) = 5000 / 0.8 = 6250
                    let newPrice = 0;
                    if (cost > 0) {
                        newPrice = Math.round(cost / (1 - margin / 100));
                    }

                    return {
                        ...item,
                        precio_unitario: newPrice
                    };
                })
            }));
        }
    };

    const handleCalculateShipping = async () => {
        if (!comuna) {
            alert('Por favor seleccione una comuna.');
            return;
        }

        setCalculatingShipment(true);
        try {
            // Ahora solo enviamos la comuna, el backend calcula para todos
            const response = await axios.post('http://127.0.0.1:8000/api/cotizacion/calcular-envio/', {
                comuna
            });

            // response.data.opciones es un dict { 'STARKEN': 5000, ... }
            setShippingOptions(response.data.opciones);

            // Actualizamos la comuna en el pedido también
            handlePedidoChange('region', region);
            handlePedidoChange('comuna', comuna);

            alert(`Se han calculado las tarifas para: ${Object.keys(response.data.opciones).join(', ')}`);

        } catch (err) {
            console.error("Error calculando envío:", err);
            alert('Error al calcular el costo de envío.');
        } finally {
            setCalculatingShipment(false);
        }
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        setError('');
        try {
            const token = localStorage.getItem('accessToken');

            const payload = {
                items: pedido.items.map(item => ({
                    id: item.id,
                    descripcion: item.descripcion,
                    cantidad: parseInt(item.cantidad, 10),
                    precio_unitario: parseInt(item.precio_unitario || 0, 10),
                    precio_compra: parseInt(item.precio_compra || 0, 10)
                })),
                porcentaje_urgencia: parseFloat(pedido.porcentaje_urgencia).toFixed(2),
                costo_envio_estimado: parseInt(pedido.costo_envio_estimado || 0, 10),
                // Nuevos campos de envío
                region: region,
                comuna: comuna,
                nombre_transporte_custom: customTransport,
                opciones_envio: shippingOptions
            };

            const response = await axios.put(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setPedido(response.data);
            setNotification({ message: '¡Cambios guardados exitosamente!', type: 'success' });

            // Auto-ocultar notificación
            setTimeout(() => setNotification({ message: '', type: '' }), 3000);

        } catch (err) {
            console.error("Error al guardar la cotización:", err);
            setError('No se pudo guardar los cambios. Por favor, intente de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!window.confirm(`¿Estás seguro de que deseas enviar esta cotización al cliente ${pedido.cliente.email}?`)) {
            return;
        }
        setSendingEmail(true);
        setError('');
        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/enviar-cotizacion/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('¡Correo de cotización enviado con éxito!');
        } catch (err) {
            console.error("Error al enviar el correo:", err);
            setError('No se pudo enviar el correo.');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleGeneratePDF = () => {
        // Ahora descarga el archivo
        window.open(`http://127.0.0.1:8000/api/pedidos/${pedidoId}/pdf/`, '_blank');
    };

    const subtotalItems = pedido ? pedido.items.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio_unitario || 0)), 0) : 0;
    const recargoUrgencia = pedido ? (subtotalItems * (parseFloat(pedido.porcentaje_urgencia || 0) / 100)) : 0;
    const costoEnvio = pedido ? parseFloat(pedido.costo_envio_estimado || 0) : 0;

    // Cálculos de IVA y Total
    const neto = subtotalItems + recargoUrgencia;
    const iva = neto * 0.19;
    const totalCotizacion = neto + iva + costoEnvio;

    // Cálculo de Ganancia Estimada
    const totalCostoCompra = pedido ? pedido.items.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio_compra || 0)), 0) : 0;
    const gananciaEstimada = neto - totalCostoCompra;
    const margen = neto > 0 ? (gananciaEstimada / neto) * 100 : 0;

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger m-5">{error}</div>;
    if (!pedido) return <div className="alert alert-warning m-5">No se encontró el pedido.</div>;

    return (
        <div className="container mt-4 mb-5">
            <Notification
                message={notification.message}
                type={notification.type}
                onClear={() => setNotification({ message: '', type: '' })}
            />

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Cotizar Pedido #{pedido.id}</h1>
                <div>
                    <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/panel/cotizaciones')}>
                        <i className="bi bi-arrow-left me-1"></i> Volver
                    </button>
                    <button className="btn btn-outline-danger" onClick={handleGeneratePDF}>
                        <i className="bi bi-file-earmark-pdf me-1"></i> Descargar PDF
                    </button>
                </div>
            </div>

            <div className="row">
                {/* Columna Izquierda: Datos Cliente y Envíos */}
                <div className="col-md-4">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <h5 className="mb-0">Datos del Cliente</h5>
                        </div>
                        <div className="card-body">
                            <p className="mb-1"><strong>Nombre:</strong> {pedido.cliente.nombres} {pedido.cliente.apellidos}</p>
                            <p className="mb-1"><strong>Empresa:</strong> {pedido.cliente.empresa || 'N/A'}</p>
                            <p className="mb-0"><strong>Email:</strong> {pedido.cliente.email}</p>
                        </div>
                    </div>

                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <h5 className="mb-0">Cálculo de Envíos</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">Región de Destino</label>
                                <select
                                    className="form-select"
                                    value={region}
                                    onChange={handleRegionChange}
                                >
                                    <option value="">Seleccione Región...</option>
                                    {REGIONES_Y_COMUNAS.map(r => (
                                        <option key={r.region} value={r.region}>{r.region}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Comuna de Destino</label>
                                <select
                                    className="form-select"
                                    value={comuna}
                                    onChange={(e) => setComuna(e.target.value)}
                                    disabled={!region}
                                >
                                    <option value="">Seleccione Comuna...</option>
                                    {comunasDisponibles.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                className="btn btn-info w-100 text-white mb-3"
                                onClick={handleCalculateShipping}
                                disabled={calculatingShipment || !comuna}
                            >
                                {calculatingShipment ? 'Calculando...' : 'Calcular Tarifas Disponibles'}
                            </button>

                            {/* Mostrar opciones calculadas */}
                            {Object.keys(shippingOptions).length > 0 && (
                                <div className="mt-3">
                                    <h6>Opciones Calculadas:</h6>
                                    <ul className="list-group">
                                        {Object.entries(shippingOptions).map(([key, value]) => (
                                            <li key={key} className="list-group-item d-flex justify-content-between align-items-center">
                                                {COURIERS_LABELS[key] || key}
                                                <span className="badge bg-primary rounded-pill">{formatCLP(value)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <small className="text-muted mt-2 d-block">
                                        * Estas opciones se mostrarán al cliente para que elija.
                                    </small>
                                </div>
                            )}

                            <hr />

                            <div className="mb-3">
                                <label className="form-label">Opción Manual / Otro</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={customTransport}
                                    onChange={(e) => setCustomTransport(e.target.value)}
                                    placeholder="Ej: Retiro en tienda..."
                                />
                                <small className="text-muted">Si ingresa texto aquí, el cliente verá esta opción como "Otro".</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Items y Totales */}
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Ítems a Cotizar</h5>
                            <div className="d-flex align-items-center">
                                <label className="me-2 mb-0 small fw-bold text-primary">Margen Global (%):</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm border-primary"
                                    style={{ width: '80px' }}
                                    value={globalMargin}
                                    onChange={handleGlobalMarginChange}
                                    placeholder="0"
                                    title="Ingresa un % para calcular automáticamente el precio de venta"
                                />
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '30%' }}>Descripción</th>
                                            <th style={{ width: '10%' }}>Cant.</th>
                                            <th style={{ width: '20%' }}>Costo Compra ($)</th>
                                            <th style={{ width: '20%' }}>Precio Venta ($)</th>
                                            <th style={{ width: '20%' }} className="text-end">Subtotal Venta ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pedido.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.descripcion}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        value={item.cantidad}
                                                        onChange={(e) => handleItemChange(item.id, 'cantidad', parseInt(e.target.value, 10))}
                                                        min="1"
                                                    />
                                                </td>
                                                <td>
                                                    <CurrencyInput
                                                        className="form-control form-control-sm border-warning"
                                                        value={item.precio_compra}
                                                        onChange={(val) => handleItemChange(item.id, 'precio_compra', val)}
                                                        placeholder="Costo..."
                                                    />
                                                </td>
                                                <td>
                                                    <CurrencyInput
                                                        className="form-control form-control-sm"
                                                        value={item.precio_unitario}
                                                        onChange={(val) => handleItemChange(item.id, 'precio_unitario', val)}
                                                        placeholder="Precio..."
                                                    />
                                                </td>
                                                <td className="text-end">
                                                    {formatCLP(item.cantidad * item.precio_unitario)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card-footer bg-white">
                            <div className="row justify-content-end">
                                <div className="col-md-6">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label mb-0">Subtotal:</label>
                                        <span className="fw-bold">{formatCLP(subtotalItems)}</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label mb-0">Recargo Urgencia (%):</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm text-end"
                                            style={{ width: '80px' }}
                                            step="0.1"
                                            value={pedido.porcentaje_urgencia}
                                            onChange={(e) => handlePedidoChange('porcentaje_urgencia', e.target.value)}
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label mb-0">Neto:</label>
                                        <span className="fw-bold">{formatCLP(neto)}</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label mb-0">IVA (19%):</label>
                                        <span className="fw-bold">{formatCLP(iva)}</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <label className="form-label mb-0">Costo Envío ($):</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm text-end"
                                            style={{ width: '100px' }}
                                            step="0.01"
                                            value={pedido.costo_envio_estimado}
                                            onChange={(e) => handlePedidoChange('costo_envio_estimado', e.target.value)}
                                            disabled // Deshabilitado porque ahora se calcula o selecciona
                                        />
                                    </div>
                                    <small className="text-muted text-end d-block mb-2">
                                        * El costo de envío final lo seleccionará el cliente.
                                    </small>

                                    <div className="border-top pt-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <h4 className="mb-0">Total Estimado:</h4>
                                            <h4 className="mb-0 text-success">{formatCLP(totalCotizacion)}</h4>
                                        </div>
                                    </div>

                                    {/* Sección de Ganancias (Solo visible internamente) */}
                                    <div className="mt-3 p-2 bg-light border rounded">
                                        <h6 className="text-muted mb-2"><i className="bi bi-graph-up"></i> Rentabilidad Estimada</h6>
                                        <div className="d-flex justify-content-between small">
                                            <span>Costo Total Compra:</span>
                                            <span>{formatCLP(totalCostoCompra)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between small fw-bold text-primary">
                                            <span>Ganancia (Neto - Costo):</span>
                                            <span>{formatCLP(gananciaEstimada)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between small">
                                            <span>Margen:</span>
                                            <span>{margen.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveChanges}
                            disabled={saving || sendingEmail}
                        >
                            <i className="bi bi-save me-1"></i>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>

                        <button
                            className="btn btn-success"
                            onClick={handleSendEmail}
                            disabled={saving || sendingEmail}
                        >
                            <i className="bi bi-envelope-paper me-1"></i>
                            {sendingEmail ? 'Enviando...' : 'Enviar Cotización'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CotizacionDetailPage;