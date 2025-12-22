// frontend/src/components/forms/SolicitudForm.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // <-- 1. IMPORTAMOS Link
import config from '../../config';

// (Los estilos del formulario se mantienen igual)
const formStyles = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '500px',
  margin: '0 auto',
  gap: '1rem',
};
const inputGroupStyles = {
  display: 'flex',
  flexDirection: 'column',
};
const inputStyles = {
  padding: '10px',
  fontSize: '1rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
};
const buttonStyles = {
  padding: '1rem',
  fontSize: '1rem',
  backgroundColor: '#28a745',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

// --- ESTILOS PARA EL CONTENEDOR DE MENSAJES ---
const messageContainerStyles = {
  padding: '2rem',
  borderRadius: '8px',
  textAlign: 'center',
  border: '1px solid',
};
const successStyles = { ...messageContainerStyles, borderColor: '#c3e6cb', backgroundColor: '#d4edda', color: '#155724' };
const errorStyles = { ...messageContainerStyles, borderColor: '#f5c6cb', backgroundColor: '#f8d7da', color: '#721c24' };

// --- NUEVO ESTILO PARA EL BOTÓN DE VOLVER ---
const homeLinkStyles = {
  display: 'inline-block',
  marginTop: '1.5rem',
  padding: '0.75rem 1.5rem',
  color: '#007bff',
  textDecoration: 'none',
  border: '1px solid #007bff',
  borderRadius: '5px',
};


const SolicitudForm = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    email: '',
    descripcion: '',
  });

  const [formState, setFormState] = useState({
    loading: false,
    message: '',
    error: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState({ loading: true, message: '', error: false });

    try {
      const apiPayload = {
        nombre_cliente: formData.nombre,
        empresa_cliente: formData.empresa,
        email_cliente: formData.email,
        descripcion_item: formData.descripcion,
      };

      await axios.post(`${config.API_URL}/solicitudes/`, apiPayload);

      setFormState({
        loading: false,
        message: '¡Gracias! Hemos recibido tu solicitud. Nos pondremos en contacto contigo a la brevedad.',
        error: false
      });
      setFormData({ nombre: '', empresa: '', email: '', descripcion: '' });

    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      setFormState({
        loading: false,
        message: 'Hubo un error al enviar tu solicitud. Por favor, inténtalo más tarde.',
        error: true
      });
    }
  };

  // --- 2. MODIFICAMOS EL BLOQUE DE ÉXITO ---
  if (formState.message && !formState.error) {
    return (
      <div style={successStyles}>
        <p>{formState.message}</p>
        <Link to="/" style={homeLinkStyles}>
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formStyles}>
      {/* ... (El resto del formulario se mantiene igual) ... */}
      <div style={inputGroupStyles}>
        <label htmlFor="nombre">Nombre Completo</label>
        <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required style={inputStyles} />
      </div>

      <div style={inputGroupStyles}>
        <label htmlFor="empresa">Empresa (Opcional)</label>
        <input type="text" id="empresa" name="empresa" value={formData.empresa} onChange={handleChange} style={inputStyles} />
      </div>

      <div style={inputGroupStyles}>
        <label htmlFor="email">Correo Electrónico</label>
        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyles} />
      </div>

      <div style={inputGroupStyles}>
        <label htmlFor="descripcion">¿Qué necesitas?</label>
        <textarea id="descripcion" name="descripcion" rows="5" value={formData.descripcion} onChange={handleChange} required style={inputStyles}></textarea>
      </div>

      {formState.message && formState.error && (
        <div style={errorStyles}>{formState.message}</div>
      )}

      <button type="submit" disabled={formState.loading} style={buttonStyles}>
        {formState.loading ? 'Enviando...' : 'Enviar Solicitud'}
      </button>
    </form>
  );
};

export default SolicitudForm;