import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg border-0" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body p-5 text-center">
          <div className="mb-4 text-primary">
            <i className="bi bi-shield-lock display-1"></i>
          </div>

          <h2 className="fw-bold mb-2">Acceso Corporativo</h2>
          <p className="text-muted mb-4 small">
            Plataforma de Gestión Interna Clarotec
          </p>

          <LoginForm />

          <div className="mt-4 pt-3 border-top">
            <Link to="/" className="text-decoration-none small text-muted hover-primary">
              <i className="bi bi-arrow-left me-1"></i>
              Volver a la Página Principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;