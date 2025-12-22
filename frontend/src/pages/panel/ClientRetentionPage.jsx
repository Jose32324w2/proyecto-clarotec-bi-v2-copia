/**
 * Dashboard de Retención de Clientes (Churn).
 * 
 * PROPÓSITO:
 * - Visualizar clientes en riesgo de fuga o perdidos.
 * - Proveer herramientas para contactar clientes (Email) y actualizar su estado.
 * - Mostrar KPIs visuales (Gráficos) sobre la distribución de clientes por región.
 * 
 * COMPONENTES:
 * - Filtros: Región, Comuna, Fecha, Búsqueda.
 * - Tabla: Lista de clientes con semáforo de riesgo.
 * - Acciones: Botones para cambiar estado y enviar correos.
 */
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Form, Toast, ToastContainer, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { REGIONES_Y_COMUNAS } from '../../data/locations';
import config from '../../config';

const ClientRetentionPage = () => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedComunas, setSelectedComunas] = useState([]);
    const [availableComunas, setAvailableComunas] = useState([]);

    // Nuevos Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Notificaciones
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');
    const [sendingEmailId, setSendingEmailId] = useState(null);

    // Actualizar comunas disponibles (Dependiente de Región)
    useEffect(() => {
        if (selectedRegions.length === 0) {
            setAvailableComunas([]);
            setSelectedComunas([]);
        } else {
            const filteredComunas = REGIONES_Y_COMUNAS
                .filter(r => selectedRegions.includes(r.region))
                .flatMap(r => r.comunas)
                .sort();
            setAvailableComunas(filteredComunas);
        }
    }, [selectedRegions]);

    // Cargar Datos
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            selectedRegions.forEach(r => params.append('region[]', r));
            selectedComunas.forEach(c => params.append('comuna[]', c));

            if (searchQuery) params.append('search', searchQuery);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await axios.get(`${config.API_URL}/bi/retention/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error loading retention data:", err);
            setError("No se pudieron cargar los datos de retención.");
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [token, selectedRegions, selectedComunas, searchQuery, startDate, endDate]);

    const handleContact = async (clientId, clientEmail, lastContactDate) => {
        // Validar si se contactó hace poco (ej. 15 días)
        if (lastContactDate) {
            const daysSinceContact = (new Date() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24);
            if (daysSinceContact < 15) {
                if (!window.confirm(`Este cliente fue contactado hace solo ${Math.round(daysSinceContact)} días. ¿Enviar correo de todas formas?`)) {
                    return;
                }
            }
        }

        setSendingEmailId(clientId);
        try {
            await axios.post(`${config.API_URL}/bi/retention/email/${clientId}/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToastMessage(`Correo enviado exitosamente a ${clientEmail}`);
            setToastVariant('success');
            setShowToast(true);
            fetchData(); // Recargar para actualizar fecha de contacto
        } catch (err) {
            console.error("Error sending email:", err);
            setToastMessage("Error al enviar el correo. Intente nuevamente.");
            setToastVariant('danger');
            setShowToast(true);
        } finally {
            setSendingEmailId(null);
        }
    };

    const handleStatusChange = async (clientId, newStatus) => {
        try {
            await axios.post(`${config.API_URL}/bi/retention/status/${clientId}/`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToastMessage("Estado actualizado correctamente.");
            setToastVariant('success');
            setShowToast(true);
            fetchData(); // Recargar tabla
        } catch (err) {
            console.error("Error updating status:", err);
            setToastMessage("Error al actualizar el estado.");
            setToastVariant('danger');
            setShowToast(true);
        }
    };

    const toggleRegion = (region) => {
        setSelectedRegions(prev =>
            prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
        );
    };

    const toggleComuna = (comuna) => {
        setSelectedComunas(prev =>
            prev.includes(comuna) ? prev.filter(c => c !== comuna) : [...prev, comuna]
        );
    };

    if (loading && !data) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    const { summary, clients } = data;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return <Badge bg="success">Activo</Badge>;
            case 'risk': return <Badge bg="warning" text="dark">En Riesgo</Badge>;
            case 'lost': return <Badge bg="danger">Perdido</Badge>;
            default: return <Badge bg="secondary">Desconocido</Badge>;
        }
    };

    const getRetentionStatusBadge = (status, display) => {
        switch (status) {
            case 'pending': return <Badge bg="light" text="dark">{display}</Badge>;
            case 'contacted': return <Badge bg="info">{display}</Badge>;
            case 'no_response': return <Badge bg="secondary">{display}</Badge>;
            case 'rejected': return <Badge bg="dark">{display}</Badge>;
            case 'recovered': return <Badge bg="success">{display}</Badge>;
            default: return <Badge bg="light" text="dark">{display}</Badge>;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CL');
    };

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">🛡️ Retención de Clientes (Churn)</h2>

            {/* Filtros */}
            <Card className="mb-4 shadow-sm">
                <Card.Header>Filtros Avanzados</Card.Header>
                <Card.Body>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>🔍 Buscar Cliente</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nombre, Empresa o Email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>📅 Última Compra Desde</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>📅 Última Compra Hasta</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <hr />
                    <Row>
                        <Col md={6}>
                            <Form.Label>📍 Regiones</Form.Label>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '10px', borderRadius: '4px' }}>
                                {REGIONES_Y_COMUNAS.map(r => (
                                    <Form.Check
                                        key={r.region}
                                        type="checkbox"
                                        label={r.region}
                                        checked={selectedRegions.includes(r.region)}
                                        onChange={() => toggleRegion(r.region)}
                                    />
                                ))}
                            </div>
                        </Col>
                        <Col md={6}>
                            <Form.Label>🏘️ Comunas {selectedRegions.length === 0 && <small className="text-muted">(Selecciona una región primero)</small>}</Form.Label>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '10px', borderRadius: '4px', backgroundColor: selectedRegions.length === 0 ? '#f8f9fa' : 'white' }}>
                                {selectedRegions.length === 0 ? (
                                    <div className="text-center text-muted p-3">
                                        <small>Selecciona al menos una región para ver las comunas.</small>
                                    </div>
                                ) : (
                                    availableComunas.map(c => (
                                        <Form.Check
                                            key={c}
                                            type="checkbox"
                                            label={c}
                                            checked={selectedComunas.includes(c)}
                                            onChange={() => toggleComuna(c)}
                                        />
                                    ))
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center shadow-sm border-success">
                        <Card.Body>
                            <h6 className="text-muted">Clientes Activos</h6>
                            <h2 className="text-success">{summary.active}</h2>
                            <small>Compraron hace &lt; 30 días</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-warning">
                        <Card.Body>
                            <h6 className="text-muted">En Riesgo (¡Llamar!)</h6>
                            <h2 className="text-warning">{summary.risk}</h2>
                            <small>Inactivos 30 - 90 días</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-danger">
                        <Card.Body>
                            <h6 className="text-muted">Perdidos</h6>
                            <h2 className="text-danger">{summary.lost}</h2>
                            <small>Inactivos &gt; 90 días</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted">Total Clientes</h6>
                            <h2>{summary.total_clients}</h2>
                            <small>Base de datos completa</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Attack List Table */}
            <Card className="shadow-sm">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0">📋 Lista de Ataque (Prioridad: Riesgo)</h5>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th>Cliente / Empresa</th>
                                <th>Estado</th>
                                <th>Último Contacto</th>
                                <th>Estado Gestión</th>
                                <th>Días Inactivo</th>
                                <th>LTV</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length > 0 ? (
                                clients.map(client => (
                                    <tr key={client.id} className={client.status === 'risk' ? 'table-warning' : ''}>
                                        <td>
                                            <div className="fw-bold">{client.nombre}</div>
                                            <small className="text-muted">{client.empresa || 'Particular'}</small>
                                            <div className="small text-muted">{client.email}</div>
                                        </td>
                                        <td>{getStatusBadge(client.status)}</td>
                                        <td>
                                            <small>{formatDate(client.last_retention_email_sent_at)}</small>
                                        </td>
                                        <td>
                                            <Dropdown onSelect={(k) => handleStatusChange(client.id, k)}>
                                                <Dropdown.Toggle variant="light" size="sm" id={`dropdown-${client.id}`}>
                                                    {getRetentionStatusBadge(client.retention_status, client.retention_status_display)}
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item eventKey="pending">Pendiente</Dropdown.Item>
                                                    <Dropdown.Item eventKey="contacted">Contactado</Dropdown.Item>
                                                    <Dropdown.Item eventKey="no_response">Sin Respuesta</Dropdown.Item>
                                                    <Dropdown.Item eventKey="rejected">Rechazado</Dropdown.Item>
                                                    <Dropdown.Item eventKey="recovered">Recuperado</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </td>
                                        <td>
                                            {client.days_inactive === 999 ? (
                                                <span className="text-muted">Nunca</span>
                                            ) : (
                                                <span className={`fw-bold ${client.status === 'risk' ? 'text-danger' : ''}`}>
                                                    {client.days_inactive} días
                                                </span>
                                            )}
                                        </td>
                                        <td>{formatCurrency(client.total_spent)}</td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                onClick={() => handleContact(client.id, client.email, client.last_retention_email_sent_at)}
                                                disabled={sendingEmailId === client.id}
                                            >
                                                {sendingEmailId === client.id ? (
                                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                ) : (
                                                    '📧 Contactar'
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">
                                        No se encontraron clientes con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <ToastContainer position="top-end" className="p-3">
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant}>
                    <Toast.Header>
                        <strong className="me-auto">Clarotec</strong>
                    </Toast.Header>
                    <Toast.Body className={toastVariant === 'success' ? 'text-white' : ''}>{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>
        </Container>
    );
};

export default ClientRetentionPage;
