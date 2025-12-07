// frontend/src/index.js
/**
 * Punto de Entrada de la Aplicación (Entry Point).
 * 
 * PROPÓSITO:
 * - Renderiza el componente raíz (<App />) en el DOM.
 * - Configura proveedores de contexto globales (AuthProvider).
 * - Inicializa interceptores de Axios y métricas web.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import './utils/axiosInterceptor'; // NUEVO: Importar interceptor para refresh automático

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Envolvemos App con nuestro proveedor de contexto */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Mantenemos la llamada a reportWebVitals
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

