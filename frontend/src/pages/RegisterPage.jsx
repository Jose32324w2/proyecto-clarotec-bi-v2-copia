import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import config from '../config';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // Para auto-login después de registro (opcional)

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setIsLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,15}$/;
        if (!passwordRegex.test(formData.password)) {
            setError("La contraseña debe tener 12-15 caracteres, mayúscula, minúscula, número y símbolo.");
            setIsLoading(false);
            return;
        }

        try {
            // 1. Registrar usuario
            await axios.post(`${config.API_URL}/register/`, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                password: formData.password
            });

            // 2. Auto-Login (Opcional, pero mejora UX)
            const success = await login(formData.email, formData.password);
            if (success) {
                navigate('/inicio'); // O a /solicitar-cotizacion
            } else {
                navigate('/login');
            }

        } catch (err) {
            console.error("Error de registro:", err);
            setError(err.response?.data?.error || "Error al registrarse. Intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow-lg border-0 rounded-lg">
                        <div className="card-header bg-primary text-white text-center py-4">
                            <h3 className="mb-0">Crear Cuenta</h3>
                            <p className="mb-0 text-white-50">Portal de Clientes Clarotec</p>
                        </div>
                        <div className="card-body p-5">
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="first_name">Nombres</label>
                                        <input
                                            className="form-control"
                                            id="first_name"
                                            name="first_name"
                                            type="text"
                                            placeholder="Juan"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="last_name">Apellidos</label>
                                        <input
                                            className="form-control"
                                            id="last_name"
                                            name="last_name"
                                            type="text"
                                            placeholder="Pérez"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="email">Correo Electrónico</label>
                                    <input
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="row mb-4">
                                    <div className="col-12 mb-2">
                                        <small className="text-muted d-block mb-2">
                                            Tu contraseña debe tener: 12-15 caracteres, mayúscula, minúscula, número y símbolo.
                                        </small>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="password">Contraseña</label>
                                        <input
                                            className="form-control"
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={12}
                                            maxLength={15}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="confirmPassword">Confirmar</label>
                                        <input
                                            className="form-control"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            minLength={12}
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-primary btn-lg"
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Registrando...
                                            </>
                                        ) : (
                                            'Registrarse'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="card-footer text-center py-3">
                            <div className="small">
                                <Link to="/login" className="text-decoration-none">
                                    ¿Ya tienes una cuenta? Iniciar Sesión
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
