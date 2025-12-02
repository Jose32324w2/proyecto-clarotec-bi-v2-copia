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
    const [selectedCliente, setSelectedCliente] = useState('');

    // Filtros Multi-Select
    const [selectedRegions, setSelectedRegions] = useState([]); // Array of strings
    const [selectedComunas, setSelectedComunas] = useState([]); // Array of strings

    // Data para filtros
    const [clientes, setClientes] = useState([]);
    const [availableComunas, setAvailableComunas] = useState([]); // Comunas filtradas por regiones seleccionadas

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

    // Actualizar comunas disponibles cuando cambian las regiones
    useEffect(() => {
        if (selectedRegions.length === 0) {
            // Si no hay región seleccionada, mostrar todas las comunas de todas las regiones
            const allComunas = REGIONES_Y_COMUNAS.flatMap(r => r.comunas).sort();
            setAvailableComunas(allComunas);
        } else {
            // Filtrar comunas de las regiones seleccionadas
            const filteredComunas = REGIONES_Y_COMUNAS
                .filter(r => selectedRegions.includes(r.region))
                .flatMap(r => r.comunas)
                .sort();
            setAvailableComunas(filteredComunas);
        }
    }, [selectedRegions]);

    // Cargar Datos del Gráfico y KPIs
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Construir Query Params manualmente para arrays
                const params = new URLSearchParams();
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
                if (selectedCliente) params.append('cliente_id', selectedCliente);

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
    }, [token, startDate, endDate, selectedCliente, selectedRegions, selectedComunas]);

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
                            <label className="form-label">Fecha Inicio</label>
                            <input
                                type="date"
                                className="form-control"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <label className="form-label">Fecha Fin</label>
                            <input
                                type="date"
                                className="form-control"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </Col>
                        <Col md={6}>
                            <label className="form-label">Cliente</label>
                            <select
                                className="form-select"
                                value={selectedCliente}
                                onChange={(e) => setSelectedCliente(e.target.value)}
                            >
                                <option value="">Todos los Clientes</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <label className="form-label">Regiones (Selección Múltiple)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {REGIONES_Y_COMUNAS.map(item => (
                                    <Form.Check
                                        key={item.region}
                                        type="checkbox"
                                        label={item.region}
                                        checked={selectedRegions.includes(item.region)}
                                        onChange={() => toggleRegion(item.region)}
                                    />
                                ))}
                            </div>
                            <div className="mt-1">
                                {selectedRegions.map(r => <Badge key={r} bg="secondary" className="me-1">{r}</Badge>)}
                            </div>
                        </Col>
                        <Col md={6}>
                            <label className="form-label">Comunas (Dinámico)</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {availableComunas.length > 0 ? (
                                    availableComunas.map(comuna => (
                                        <Form.Check
                                            key={comuna}
                                            type="checkbox"
                                            label={comuna}
                                            checked={selectedComunas.includes(comuna)}
                                            onChange={() => toggleComuna(comuna)}
                                        />
                                    ))
                                ) : (
                                    <span className="text-muted">Cargando comunas...</span>
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
                <Row className="mb-4">
                    {/* KPI 1: Volumen de Ventas (NUEVO) */}
                    <Col md={3}>
                        <Card className="shadow-sm h-100 text-center border-primary">
                            <Card.Body>
                                <h6 className="text-muted">Volumen de Ventas</h6>
                                <h3 className="text-primary">${kpiData.total_ingresos?.toLocaleString()}</h3>
                                <p className="mb-0 text-muted">
                                    <strong>{kpiData.total_pedidos}</strong> pedidos completados
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* KPI 2: Margen Operacional */}
                    <Col md={3}>
                        <Card className="shadow-sm h-100 text-center">
                            <Card.Body>
                                <h6 className="text-muted">Margen Operacional</h6>
                                <h3 className={kpiData.margen_operacional >= 20 ? 'text-success' : 'text-warning'}>
                                    {kpiData.margen_operacional}%
                                </h3>
                                <p className="mb-0 text-muted">
                                    <small>Utilidad: ${kpiData.total_utilidad?.toLocaleString()}</small>
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* KPI 3: Tasa de Recurrencia */}
                    <Col md={3}>
                        <Card className="shadow-sm h-100 text-center">
                            <Card.Body>
                                <h6 className="text-muted">Tasa de Recurrencia</h6>
                                <h3 className="text-dark">{kpiData.tasa_recurrencia}%</h3>
                                <p className="mb-0 text-muted">
                                    <small>{kpiData.clientes_recurrentes} recurrentes</small>
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Gráfico: Distribución Clientes */}
                    <Col md={3}>
                        <Card className="shadow-sm h-100">
                            <Card.Body style={{ height: '150px', padding: '5px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Nuevos', value: kpiData.clientes_nuevos },
                                                { name: 'Recurrentes', value: kpiData.clientes_recurrentes }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell key="cell-new" fill="#00C49F" />
                                            <Cell key="cell-recurring" fill="#FFBB28" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={20} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
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
                                                    data={dashboardStats.sales_by_region}
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} style={{ fontSize: '10px' }} />
                                                    <YAxis />
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
