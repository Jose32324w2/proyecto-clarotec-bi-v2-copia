/**
 * Página de Solicitud de Cotización (Pública).
 * 
 * PROPÓSITO:
 * - Permite a clientes nuevos o existentes pedir cotizaciones.
 * - Integra 3 métodos de entrada: Link, Manual y Catálogo.
 * - Gestiona el carrito de compras temporal antes de enviar al backend.
 */
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import LinkInput from '../components/quotation/LinkInput';
import ManualInput from '../components/quotation/ManualInput';
import CatalogCard from '../components/quotation/CatalogCard';
import CartSummary from '../components/quotation/CartSummary';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { REGIONES_Y_COMUNAS } from '../data/locations';

const SolicitudPage = () => {
    const { cart, clearCart } = useCart();
    const { user } = useAuth();
    const [frequentProducts, setFrequentProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // Form State for Client Data
    const [clientData, setClientData] = useState({
        nombre: '',
        email: '',
        empresa: '',
        telefono: '',
        region: '',
        comuna: ''
    });
    const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: '' });
    const [comunasDisponibles, setComunasDisponibles] = useState([]);

    useEffect(() => {
        // Fetch frequent products
        const fetchProducts = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/productos/frecuentes/');
                setFrequentProducts(response.data);
            } catch (error) {
                console.error("Error loading products:", error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // Pre-fill user data if logged in
    useEffect(() => {
        if (user) {
            setClientData(prev => ({
                ...prev,
                nombres: user.first_name || '',
                apellidos: user.last_name || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const handleClientChange = (e) => {
        const { name, value } = e.target;

        if (name === 'region') {
            // Al cambiar región, actualizamos las comunas disponibles y reseteamos la comuna seleccionada
            const regionData = REGIONES_Y_COMUNAS.find(r => r.region === value);
            setComunasDisponibles(regionData ? regionData.comunas : []);
            setClientData({ ...clientData, region: value, comuna: '' });
        } else {
            setClientData({ ...clientData, [name]: value });
        }
    };

    const handleSubmit = async () => {
        if (cart.length === 0) return;
        setSubmitStatus({ loading: true, success: false, error: '' });

        const payload = {
            cliente: {
                nombres: clientData.nombres,
                apellidos: clientData.apellidos,
                email: clientData.email,
                empresa: clientData.empresa,
                telefono: clientData.telefono
            },
            region: clientData.region,
            comuna: clientData.comuna,
            items: cart.map(item => ({
                tipo: item.source,
                descripcion: item.name + (item.details ? ` - ${item.details}` : ''),
                cantidad: item.qty,
                referencia: item.referencia || '',
                producto_id: item.source === 'CATALOGO' ? item.original_id : null
            }))
        };

        try {
            await axios.post('http://127.0.0.1:8000/api/solicitudes/', payload);
            setSubmitStatus({ loading: false, success: true, error: '' });
            clearCart();
            setClientData({ nombres: '', apellidos: '', email: '', empresa: '', telefono: '', region: '', comuna: '' });
            setComunasDisponibles([]);
        } catch (error) {
            console.error("Error submitting request:", error);
            setSubmitStatus({
                loading: false,
                success: false,
                error: 'Hubo un error al enviar la solicitud. Por favor intenta nuevamente.'
            });
        }
    };

    if (submitStatus.success) {
        return (
            <div className="container py-5 text-center">
                <div className="card border-success shadow-sm p-5" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="mb-4 text-success">
                        <i className="bi bi-check-circle-fill display-1"></i>
                    </div>
                    <h2 className="mb-3">¡Solicitud Enviada!</h2>
                    <p className="lead text-muted">
                        Hemos recibido tu requerimiento exitosamente. Uno de nuestros ejecutivos comerciales revisará tu solicitud y te enviará una cotización formal a tu correo <strong>{clientData.email}</strong> a la brevedad.
                    </p>
                    <div className="mt-4">
                        <button onClick={() => setSubmitStatus({ ...submitStatus, success: false })} className="btn btn-outline-primary me-3">
                            Nueva Solicitud
                        </button>
                        <Link to="/" className="btn btn-primary">
                            Volver al Inicio
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid bg-light min-vh-100 py-4">
            <div className="container">
                <div className="row">
                    <div className="col-12 mb-4">
                        <h2 className="fw-bold text-dark">Nueva Cotización</h2>
                        <p className="text-muted">Agrega productos mediante links, ingreso manual o desde nuestro catálogo.</p>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Left Column: Inputs */}
                    <div className="col-lg-8">
                        <LinkInput />
                        <ManualInput />

                        <div className="mt-5">
                            <h6 className="text-uppercase text-muted mb-3 small fw-bold">Opción 3: Catálogo Frecuente</h6>
                            {loadingProducts ? (
                                <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="row g-3">
                                    {frequentProducts.map(product => (
                                        <div key={product.id} className="col-md-6">
                                            <CatalogCard product={product} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Cart Summary & Client Form */}
                    <div className="col-lg-4">
                        <div className="sticky-top" style={{ top: '20px', zIndex: 100 }}>
                            <CartSummary />

                            <div className="card mt-3 shadow-sm border-0">
                                <div className="card-body">
                                    <h6 className="card-title mb-3">Datos de Contacto</h6>
                                    <div className="mb-2">
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <input
                                                    type="text" className="form-control form-control-sm" placeholder="Nombres *"
                                                    name="nombres" value={clientData.nombres} onChange={handleClientChange} required
                                                />
                                            </div>
                                            <div className="col-6">
                                                <input
                                                    type="text" className="form-control form-control-sm" placeholder="Apellidos *"
                                                    name="apellidos" value={clientData.apellidos} onChange={handleClientChange} required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-2">
                                        <input
                                            type="email" className="form-control form-control-sm" placeholder="Email Corporativo *"
                                            name="email" value={clientData.email} onChange={handleClientChange} required
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <input
                                            type="text" className="form-control form-control-sm" placeholder="Empresa (Opcional)"
                                            name="empresa" value={clientData.empresa} onChange={handleClientChange}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <input
                                            type="tel" className="form-control form-control-sm" placeholder="Teléfono (Opcional)"
                                            name="telefono" value={clientData.telefono} onChange={handleClientChange}
                                        />
                                    </div>

                                    <h6 className="card-title mb-3 mt-4">Datos de Envío (Estimado)</h6>
                                    <div className="mb-2">
                                        <select
                                            className="form-select form-select-sm"
                                            name="region"
                                            value={clientData.region}
                                            onChange={handleClientChange}
                                        >
                                            <option value="">Seleccione Región...</option>
                                            {REGIONES_Y_COMUNAS.map(r => (
                                                <option key={r.region} value={r.region}>{r.region}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <select
                                            className="form-select form-select-sm"
                                            name="comuna"
                                            value={clientData.comuna}
                                            onChange={handleClientChange}
                                            disabled={!clientData.region}
                                        >
                                            <option value="">Seleccione Comuna...</option>
                                            {comunasDisponibles.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {submitStatus.error && <div className="alert alert-danger small">{submitStatus.error}</div>}

                                    <button
                                        onClick={handleSubmit}
                                        disabled={cart.length === 0 || !clientData.nombres || !clientData.apellidos || !clientData.email || !clientData.region || !clientData.comuna || submitStatus.loading}
                                        className="btn btn-success w-100 py-2 fw-bold"
                                    >
                                        {submitStatus.loading ? 'Enviando...' : 'Solicitar Cotización Formal →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SolicitudPage;