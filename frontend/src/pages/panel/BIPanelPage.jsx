/**
 * Panel de Inteligencia de Negocios (BI).
 * 
 * PROPÓSITO:
 * - Dashboard principal de métricas y estadísticas.
 * - Visualización de Rentabilidad, Volumen de Ventas y Productos Top.
 * - Integración de gráficos interactivos (Recharts) con filtros dinámicos.
 */
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Form, Badge } from 'react-bootstrap';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area, Brush, ReferenceLine } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { REGIONES_Y_COMUNAS } from '../../data/locations';


const BIPanelPage = () => {
    const { token } = useAuth();
    const [data, setData] = useState([]);
    const [kpiData, setKpiData] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Filtros Multi-Select
    const [selectedMonths, setSelectedMonths] = useState([]); // Array strings 'YYYY-MM'
    const [selectedClientes, setSelectedClientes] = useState([]); // Array IDs
    const [selectedClientTypes, setSelectedClientTypes] = useState([]); // Array strings 'new', 'recurring'
    const [selectedRegions, setSelectedRegions] = useState([]); // Array of strings
    const [selectedComunas, setSelectedComunas] = useState([]); // Array of strings

    // Data para filtros
    const [availableOptions, setAvailableOptions] = useState({
        clients: [],
        regions: [],
        comunas: [],
        months: []
    });

    const [clientes, setClientes] = useState([]);
    // const [availableComunas, setAvailableComunas] = useState([]); // REMOVE: Managed by API now
    const [monthOptions, setMonthOptions] = useState([]);

    // Cargar Clientes
    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/clientes-crud/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setClientes(response.data);
            } catch (err) {
                console.error("Error cargando clientes:", err);
            }
        };
        fetchClientes();
    }, [token]);

    // Generar opciones de Meses
    useEffect(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 13; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const value = `${year}-${month}`;
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            options.push({ value, label: formattedLabel });
        }
        setMonthOptions(options);
    }, []);

    // Cargar Opciones Dinámicas (Facetas)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const params = new URLSearchParams();
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
                selectedMonths.forEach(m => params.append('month[]', m));
                selectedClientes.forEach(c => params.append('cliente_id[]', c));
                selectedClientTypes.forEach(t => params.append('client_type[]', t));
                selectedRegions.forEach(r => params.append('region[]', r));
                selectedComunas.forEach(c => params.append('comuna[]', c));

                const response = await axios.get(`http://localhost:8000/api/bi/filter-options/?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAvailableOptions(response.data);
            } catch (err) {
                console.error("Error fetching filter options:", err);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchFilterOptions();
        }, 300); // Debounce ligero

        return () => clearTimeout(timeoutId);
    }, [token, startDate, endDate, selectedMonths, selectedClientes, selectedClientTypes, selectedRegions, selectedComunas]);

    // Deprecated: Local Comuna Logic replaced by API
    /*
    useEffect(() => {
        // ... (Logic removed in favor of API)
    }, [selectedRegions]);
    */

    // Cargar Datos del Gráfico y KPIs
    useEffect(() => {
        const fetchData = async () => {
            // Validar fechas antes de enviar
            const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
            if (startDate && !isValidDate(startDate)) return;
            if (endDate && !isValidDate(endDate)) return;

            setLoading(true);
            try {
                // Construir Query Params manualmente para arrays
                const params = new URLSearchParams();
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);

                selectedMonths.forEach(m => params.append('month[]', m));
                selectedClientes.forEach(c => params.append('cliente_id[]', c));
                selectedClientTypes.forEach(t => params.append('client_type[]', t));

                selectedRegions.forEach(r => params.append('region[]', r));
                selectedComunas.forEach(c => params.append('comuna[]', c));

                const queryString = params.toString();

                // Fetch Scatter Plot Data
                const responseScatter = await axios.get(`http://localhost:8000/api/bi/rentabilidad/?${queryString}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(responseScatter.data);

                // Fetch KPI Data
                const responseKPI = await axios.get(`http://localhost:8000/api/bi/kpis/?${queryString}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKpiData(responseKPI.data);

                // Fetch Advanced Dashboard Stats
                const responseStats = await axios.get(`http://localhost:8000/api/bi/dashboard-stats/?${queryString}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDashboardStats(responseStats.data);

                setLoading(false);
            } catch (err) {
                console.error("Error fetching BI data:", err);
                setError("No se pudieron cargar los datos de inteligencia de negocios.");
                setLoading(false);
            }
        };

        fetchData();
    }, [token, startDate, endDate, selectedMonths, selectedClientes, selectedClientTypes, selectedRegions, selectedComunas]);

    // Handlers para Multi-Select (Simple Toggle)
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

    const toggleMonth = (val) => {
        setSelectedMonths(prev =>
            prev.includes(val) ? prev.filter(m => m !== val) : [...prev, val]
        );
        setStartDate('');
        setEndDate('');
    };

    const toggleCliente = (id) => {
        const idStr = String(id);
        setSelectedClientes(prev =>
            prev.includes(idStr) ? prev.filter(c => c !== idStr) : [...prev, idStr]
        );
    };

    const toggleClientType = (type) => {
        setSelectedClientTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                    <p className="label"><strong>Pedido #{dataPoint.id}</strong></p>
                    <p className="intro">{`Cliente: ${dataPoint.cliente}`}</p>
                    <p className="intro">{`Fecha: ${dataPoint.fecha}`}</p>
                    <p className="desc" style={{ color: 'green' }}>{`Ganancia: $${dataPoint.ganancia.toLocaleString()}`}</p>
                    <p className="desc" style={{ color: 'blue' }}>{`Margen: ${dataPoint.margen}%`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Inteligencia de Negocios (BI)</h2>

            {/* --- SECCIÓN DE FILTROS --- */}
            <Card className="mb-4 shadow-sm">
                <Card.Header as="h6">Filtros Avanzados</Card.Header>
                <Card.Body>
                    <Row className="mb-3">
                        <Col md={3}>
                            <label className="form-label">Meses (Multi-Select)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff' }}>
                                {monthOptions.map(opt => {
                                    const isAvailable = availableOptions.months.length === 0 || availableOptions.months.includes(opt.value);
                                    // Si hay selección activa de meses, mostramos los seleccionados SIEMPRE para no perder contexto.
                                    // Pero el endpoint devuelve meses disponibles considerando OTROS filtros.
                                    // Si no hay coincidencias, mejor deshabilitar o mostrar en gris.
                                    // El usuario pidió "evitar colocar algo que no va".
                                    if (!isAvailable && !selectedMonths.includes(opt.value)) return null;

                                    return (
                                        <Form.Check
                                            key={opt.value}
                                            type="checkbox"
                                            label={opt.label}
                                            checked={selectedMonths.includes(opt.value)}
                                            onChange={() => toggleMonth(opt.value)}
                                            style={{ opacity: isAvailable ? 1 : 0.5 }}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-1">
                                {selectedMonths.length > 0 && <Badge bg="primary">{selectedMonths.length} meses</Badge>}
                            </div>
                        </Col>

                        <Col md={3}>
                            <label className="form-label">Clientes (Multi-Select)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff' }}>
                                {clientes.map(c => {
                                    const idStr = String(c.id);
                                    // Available check: API returns ints usually, verify type match.
                                    const isAvailable = availableOptions.clients.length === 0 || availableOptions.clients.includes(c.id);

                                    if (!isAvailable && !selectedClientes.includes(idStr)) return null;

                                    return (
                                        <Form.Check
                                            key={c.id}
                                            type="checkbox"
                                            label={c.nombre}
                                            checked={selectedClientes.includes(idStr)}
                                            onChange={() => toggleCliente(c.id)}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-1">
                                {selectedClientes.length > 0 && <Badge bg="info">{selectedClientes.length} clientes</Badge>}
                            </div>
                        </Col>

                        <Col md={3}>
                            <label className="form-label">Tipo Cliente</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff' }}>
                                <Form.Check
                                    type="checkbox"
                                    label="Nuevos"
                                    checked={selectedClientTypes.includes('new')}
                                    onChange={() => toggleClientType('new')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    label="Recurrentes"
                                    checked={selectedClientTypes.includes('recurring')}
                                    onChange={() => toggleClientType('recurring')}
                                />
                            </div>
                        </Col>

                        <Col md={3}>
                            <label className="form-label fw-bold">Rango Personalizado</label>
                            <div className="mb-2">
                                <small>Inicio</small>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={selectedMonths.length > 0}
                                />
                            </div>
                            <div>
                                <small>Fin</small>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={selectedMonths.length > 0}
                                />
                            </div>
                            {selectedMonths.length > 0 && <small className="text-muted">* Meses seleccionados tienen prioridad</small>}
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <label className="form-label">Regiones (Selección Múltiple)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {REGIONES_Y_COMUNAS.map(item => {
                                    const isAvailable = availableOptions.regions.length === 0 || availableOptions.regions.includes(item.region);
                                    if (!isAvailable && !selectedRegions.includes(item.region)) return null;

                                    return (
                                        <Form.Check
                                            key={item.region}
                                            type="checkbox"
                                            label={item.region}
                                            checked={selectedRegions.includes(item.region)}
                                            onChange={() => toggleRegion(item.region)}
                                        />
                                    )
                                })}
                            </div>
                            <div className="mt-1">
                                {selectedRegions.map(r => <Badge key={r} bg="secondary" className="me-1">{r}</Badge>)}
                            </div>
                        </Col>
                        <Col md={6}>
                            <label className="form-label">Comunas (Dinámico)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {availableOptions.comunas && availableOptions.comunas.length > 0 ? (
                                    // Mostrar TODAS las comunas disponibles según la API (ya filtradas por región si aplica)
                                    // Pero necesitamos iterar sobre QUE? availableOptions.comunas es la lista ideal.
                                    availableOptions.comunas.sort().map(comuna => (
                                        <Form.Check
                                            key={comuna}
                                            type="checkbox"
                                            label={comuna}
                                            checked={selectedComunas.includes(comuna)}
                                            onChange={() => toggleComuna(comuna)}
                                        />
                                    ))
                                ) : (
                                    <span className="text-muted">Sin comunas disponibles...</span>
                                )}
                            </div>
                            <div className="mt-1">
                                {selectedComunas.length > 0 && <Badge bg="info">{selectedComunas.length} seleccionadas</Badge>}
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* --- SECCIÓN DE KPIs --- */}
            {kpiData && (
                <>
                    {/* --- ROW 1: KPIs FINANCIEROS (DESGLOSE) --- */}
                    <Row className="mb-4">
                        {/* 1. Total Facturado (Bruto) */}
                        <Col md={3}>
                            <Card className="shadow-sm h-100 text-center border-primary">
                                <Card.Body>
                                    <h6 className="text-muted text-uppercase small ls-1">Total Facturado</h6>
                                    <h3 className="text-primary fw-bold my-2">${kpiData.total_ingresos?.toLocaleString()}</h3>
                                    <Badge bg="light" text="dark" className="border">
                                        {kpiData.total_pedidos} pedidos
                                    </Badge>
                                    <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
                                        <span className="d-block">IVA (19%): ${kpiData.total_iva?.toLocaleString()}</span>
                                        <span className="d-block">Envíos: ${kpiData.total_envios?.toLocaleString()}</span>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* 2. Venta Neta (Base Imponible) */}
                        <Col md={3}>
                            <Card className="shadow-sm h-100 text-center border-info">
                                <Card.Body>
                                    <h6 className="text-muted text-uppercase small ls-1">Venta Neta</h6>
                                    <h3 className="text-info fw-bold my-2">${kpiData.total_neto?.toLocaleString()}</h3>
                                    <small className="d-block text-muted mt-3" style={{ fontSize: '0.75rem' }}>
                                        Ingreso Real (Sin IVA)
                                    </small>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* 3. Costos Operacionales */}
                        <Col md={3}>
                            <Card className="shadow-sm h-100 text-center border-danger">
                                <Card.Body>
                                    <h6 className="text-muted text-uppercase small ls-1">Costos Totales</h6>
                                    <h3 className="text-danger fw-bold my-2">${kpiData.total_costos?.toLocaleString()}</h3>
                                    <small className="d-block text-muted mt-3" style={{ fontSize: '0.75rem' }}>
                                        Costo de Productos
                                    </small>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* 4. Utilidad y Margen */}
                        <Col md={3}>
                            <Card className="shadow-sm h-100 text-center border-success">
                                <Card.Body>
                                    <h6 className="text-muted text-uppercase small ls-1">Utilidad Neta</h6>
                                    <h3 className="text-success fw-bold my-2 py-1">${kpiData.total_utilidad?.toLocaleString()}</h3>
                                    <Badge
                                        bg={kpiData.margen_operacional > 30 ? 'success' : kpiData.margen_operacional > 10 ? 'warning' : 'danger'}
                                        text={kpiData.margen_operacional > 10 && kpiData.margen_operacional <= 30 ? 'dark' : 'white'}
                                        className="mt-1 px-3 py-2 rounded-pill shadow-sm"
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        Margen: {kpiData.margen_operacional}%
                                    </Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* --- ROW 2: KPIs CLIENTES --- */}
                    <Row className="mb-4">
                        <Col md={6}>
                            <Card className="shadow-sm h-100">
                                <Card.Header as="h6" className="bg-white border-bottom-0">Tasa de Recurrencia</Card.Header>
                                <Card.Body className="d-flex align-items-center justify-content-center">
                                    <div className="text-center">
                                        <h2 className="display-4 fw-bold">{kpiData.tasa_recurrencia}%</h2>
                                        <p className="text-muted">{kpiData.clientes_recurrentes} clientes recurrentes</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={6}>
                            <Card className="shadow-sm h-100">
                                <Card.Header as="h6" className="bg-white border-bottom-0">Distribución de Clientes</Card.Header>
                                <Card.Body style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Nuevos', value: kpiData.clientes_nuevos },
                                                    { name: 'Recurrentes', value: kpiData.clientes_recurrentes }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell key="cell-new" fill="#00C49F" />
                                                <Cell key="cell-recurring" fill="#FFBB28" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}

            {loading ? (
                <Container className="text-center py-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </Spinner>
                </Container>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : (
                <>
                    <Row>
                        <Col md={12}>
                            <Card className="mb-4 shadow-sm">
                                <Card.Header as="h5">Rentabilidad Histórica (Pedidos Completados)</Card.Header>
                                <Card.Body>
                                    <div style={{ width: '100%', height: 400 }}>
                                        {data.length > 0 ? (
                                            <ResponsiveContainer>
                                                <ScatterChart
                                                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                                >
                                                    <CartesianGrid />
                                                    <XAxis type="category" dataKey="fecha" name="Fecha" allowDuplicatedCategory={false} />
                                                    <YAxis type="number" dataKey="ganancia" name="Ganancia" unit="$" />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    <ReferenceLine y={0} stroke="#000" />
                                                    <Scatter name="Pedidos" data={data} fill="#8884d8">
                                                        {data.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.margen > 30 ? '#00C49F' : entry.margen > 10 ? '#FFBB28' : '#FF8042'} />
                                                        ))}
                                                    </Scatter>
                                                    <Brush dataKey="fecha" height={30} stroke="#8884d8" />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <Alert variant="info">No se encontraron datos con los filtros seleccionados.</Alert>
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <Badge bg="success" className="me-2">Margen Alto {'>'} 30%</Badge>
                                        <Badge bg="warning" text="dark" className="me-2">Margen Medio 10-30%</Badge>
                                        <Badge bg="danger">Margen Bajo {'<'} 10%</Badge>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* --- SECCIÓN AVANZADA (NUEVA) --- */}
                    {dashboardStats && (
                        <>
                            <Row className="mb-4">
                                {/* Tendencia Mensual */}
                                <Col md={12}>
                                    <Card className="shadow-sm">
                                        <Card.Header as="h5">Tendencia de Crecimiento Mensual</Card.Header>
                                        <Card.Body style={{ height: '300px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dashboardStats.monthly_trend}>
                                                    <defs>
                                                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis />
                                                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                                    <Area type="monotone" dataKey="ventas" stroke="#8884d8" fillOpacity={1} fill="url(#colorVentas)" name="Ventas Totales" />
                                                    <Area type="monotone" dataKey="utilidad" stroke="#82ca9d" fillOpacity={0.3} fill="#82ca9d" name="Utilidad Neta" />
                                                    <Legend />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Row>
                                {/* Top 10 Productos */}
                                <Col md={6}>
                                    <Card className="shadow-sm mb-4">
                                        <Card.Header as="h5">🏆 Top 10 Productos (Ingresos)</Card.Header>
                                        <Card.Body style={{ height: '400px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    layout="vertical"
                                                    data={dashboardStats.top_products}
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis type="category" dataKey="name" width={150} style={{ fontSize: '12px' }} />
                                                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                                    <Bar dataKey="value" fill="#82ca9d" name="Ingresos" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Ventas por Región */}
                                <Col md={6}>
                                    <Card className="shadow-sm mb-4">
                                        <Card.Header as="h5">🗺️ Ventas por Región</Card.Header>
                                        <Card.Body style={{ height: '400px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    layout="vertical"
                                                    data={dashboardStats.sales_by_region}
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis type="category" dataKey="name" width={150} style={{ fontSize: '10px' }} />
                                                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                                    <Bar dataKey="value" fill="#8884d8" name="Ventas" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </>
            )}
        </Container>
    );
};

export default BIPanelPage;
