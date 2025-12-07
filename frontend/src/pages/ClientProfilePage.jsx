import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const ClientProfilePage = () => {
    const { token } = useAuth(); // authUser tiene datos básicos de sesión
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        telefono: '',
        empresa: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch full profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/users/me/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;

                // Mapear datos backend -> formulario
                // data.cliente_data puede ser null si es admin, pero aquí asumimos rol Cliente
                const clientData = data.cliente_data || {};

                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || '',
                    telefono: clientData.telefono || '',
                    empresa: clientData.empresa || ''
                });
            } catch (err) {
                console.error("Error cargando perfil:", err);
                setMessage({ type: 'danger', text: 'No se pudo cargar la información del perfil.' });
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchProfile();
    }, [token]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                telefono: formData.telefono,
                empresa: formData.empresa
            };

            await axios.patch('http://localhost:8000/api/users/me/', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });

            // Opcional: Actualizar contexto global si fuera necesario, 
            // pero por ahora basta con que el formulario refleje los cambios.

        } catch (err) {
            console.error("Error actualizando perfil:", err);
            setMessage({ type: 'danger', text: 'Error al actualizar el perfil. Intente nuevamente.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 border-bottom-0">
                            <h3 className="mb-0 fw-bold text-primary">
                                <i className="bi bi-person-circle me-2"></i>Mi Perfil
                            </h3>
                        </div>
                        <div className="card-body p-4">

                            {message.text && (
                                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                                    {message.text}
                                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="first_name">Nombres</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="first_name"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="last_name">Apellidos</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="last_name"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-muted">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        className="form-control bg-light"
                                        value={formData.email}
                                        disabled
                                        readOnly
                                    />
                                    <small className="text-muted">El correo no se puede cambiar.</small>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="telefono">Teléfono de Contacto</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        id="telefono"
                                        name="telefono"
                                        placeholder="+56 9 1234 5678"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label" htmlFor="empresa">Empresa (Opcional)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="empresa"
                                        name="empresa"
                                        placeholder="Nombre de tu empresa"
                                        value={formData.empresa}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="d-grid">
                                    <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Guardando...
                                            </>
                                        ) : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientProfilePage;
