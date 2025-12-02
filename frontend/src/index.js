// frontend/src/index.js

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

