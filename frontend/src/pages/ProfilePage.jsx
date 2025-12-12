import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const ProfilePage = () => {
    const { token, user, logout } = useAuth();

    // Estado Perfil
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        telefono: '',
        empresa: ''
    });

    // Estado Password
    const [passData, setPassData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });

    const isCliente = user?.rol?.nombre === 'Cliente';

    // Fetch full profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;

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

    const handlePassChange = (e) => {
        setPassData({
            ...passData,
            [e.target.name]: e.target.value
        });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
            };

            // Solo enviar datos de cliente si es cliente
            if (isCliente) {
                payload.telefono = formData.telefono;
                payload.empresa = formData.empresa;
            }

            await axios.patch(`${process.env.REACT_APP_API_URL}/users/me/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
        } catch (err) {
            console.error("Error actualizando perfil:", err);
            setMessage({ type: 'danger', text: 'Error al actualizar el perfil.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setSavingPass(true);
        setPassMessage({ type: '', text: '' });

        if (passData.new_password !== passData.confirm_password) {
            setPassMessage({ type: 'danger', text: 'Las contraseñas nuevas no coinciden.' });
            setSavingPass(false);
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,15}$/;
        if (!passwordRegex.test(passData.new_password)) {
            setPassMessage({ type: 'danger', text: 'La contraseña debe tener 12-15 caracteres, mayúscula, minúscula, número y símbolo.' });
            setSavingPass(false);
            return;
        }

        try {
            await axios.patch(`${process.env.REACT_APP_API_URL}/users/me/password/`, {
                current_password: passData.current_password,
                new_password: passData.new_password
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPassMessage({ type: 'success', text: 'Contraseña actualizada. Inicia sesión nuevamente.' });
            setPassData({ current_password: '', new_password: '', confirm_password: '' });

            // Opcional: Cerrar sesión forzado tras cambio de pass
            // setTimeout(() => logout(), 2000);

        } catch (err) {
            console.error("Error cambiando password:", err);
            const errorText = err.response?.data?.error || 'Error al cambiar la contraseña.';
            setPassMessage({ type: 'danger', text: errorText });
        } finally {
            setSavingPass(false);
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-5 mb-5">
            <div className="row justify-content-center g-4">

                {/* Columna Izquierda: Datos del Perfil */}
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white py-3 border-bottom-0">
                            <h4 className="mb-0 fw-bold text-primary">
                                <i className="bi bi-person-circle me-2"></i>Datos Personales
                            </h4>
                        </div>
                        <div className="card-body p-4">
                            {message.text && (
                                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                                    {message.text}
                                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit}>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Nombres</label>
                                        <input type="text" className="form-control" name="first_name" value={formData.first_name} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Apellidos</label>
                                        <input type="text" className="form-control" name="last_name" value={formData.last_name} onChange={handleChange} required />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-muted">Email</label>
                                    <input type="email" className="form-control bg-light" value={formData.email} disabled readOnly />
                                </div>

                                {isCliente && (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label">Teléfono</label>
                                            <input type="tel" className="form-control" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="+56 9 ..." />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Empresa</label>
                                            <input type="text" className="form-control" name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Nombre Empresa" />
                                        </div>
                                    </>
                                )}

                                <div className="d-grid mt-4">
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Guardando...' : 'Guardar Datos'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Seguridad (Password) */}
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white py-3 border-bottom-0">
                            <h4 className="mb-0 fw-bold text-danger">
                                <i className="bi bi-shield-lock me-2"></i>Seguridad
                            </h4>
                        </div>
                        <div className="card-body p-4">
                            <p className="text-muted small mb-4">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>

                            <div className="alert alert-light border small text-muted">
                                <strong>Requisitos de contraseña:</strong>
                                <ul className="mb-0 ps-3 mt-1">
                                    <li>Entre 12 y 15 caracteres.</li>
                                    <li>Al menos una mayúscula y una minúscula.</li>
                                    <li>Al menos un número.</li>
                                    <li>Al menos un símbolo (ej: @, $, _, -).</li>
                                </ul>
                            </div>

                            {passMessage.text && (
                                <div className={`alert alert-${passMessage.type} alert-dismissible fade show`} role="alert">
                                    {passMessage.text}
                                    <button type="button" className="btn-close" onClick={() => setPassMessage({ type: '', text: '' })}></button>
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        name="current_password"
                                        value={passData.current_password}
                                        onChange={handlePassChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        name="new_password"
                                        value={passData.new_password}
                                        onChange={handlePassChange}
                                        required
                                        minLength={12}
                                        maxLength={15}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Confirmar Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        name="confirm_password"
                                        value={passData.confirm_password}
                                        onChange={handlePassChange}
                                        required
                                    />
                                </div>

                                <div className="d-grid mt-4">
                                    <button type="submit" className="btn btn-outline-danger" disabled={savingPass}>
                                        {savingPass ? 'Actualizando...' : 'Cambiar Contraseña'}
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

export default ProfilePage;
