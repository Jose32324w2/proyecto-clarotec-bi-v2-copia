"""
Servicios de Lógica de Negocio (Backend).

PROPOSITO:
    Encapsula lógica compleja reutilizable que no pertenece a Modelos ni Vistas.
    
SERVICIOS:
    - ShippingCalculator: Calcula costos de envío por región/comuna.
"""
# backend/gestion/services.py

class ShippingCalculator:
    """
    Servicio para calcular costos de envío estimados basados en zonas geográficas.
    """

    # Precios base por zona (Valores referenciales)
    ZONA_PRECIOS = {
        'RM': 4500,
        'CENTRO': 6500,  # V, VI, VII
        'NORTE': 8900,   # XV, I, II, III, IV
        'SUR': 7900,     # VIII, IX, XIV, X
        'EXTREMO': 12500  # XI, XII
    }

    # Multiplicadores por Courier (Factor de servicio)
    COURIER_MULTIPLIERS = {
        'STARKEN': 1.0,      # Estándar
        'CHILEXPRESS': 1.4,  # Más rápido/caro
        'BLUE': 0.9,         # Económico
    }

    # Mapa simple de Comuna -> Zona (Ejemplo simplificado)
    # En un sistema real, esto vendría de una BD o API externa
    COMUNA_ZONA_MAP = {
        # RM
        'santiago': 'RM', 'providencia': 'RM', 'las condes': 'RM', 'maipu': 'RM', 'puente alto': 'RM',

        # NORTE
        'arica': 'NORTE', 'iquique': 'NORTE', 'antofagasta': 'NORTE', 'copiapo': 'NORTE', 'la serena': 'NORTE',

        # CENTRO
        'valparaiso': 'CENTRO', 'viña del mar': 'CENTRO', 'rancagua': 'CENTRO', 'talca': 'CENTRO',

        # SUR
        'concepcion': 'SUR', 'temuco': 'SUR', 'valdivia': 'SUR', 'puerto montt': 'SUR',

        # EXTREMO
        'coyhaique': 'EXTREMO', 'punta arenas': 'EXTREMO'
    }

    @classmethod
    def get_zona_from_comuna(cls, comuna_nombre):
        """ Normaliza el nombre de la comuna y busca su zona. Default: RM """
        if not comuna_nombre:
            return 'RM'

        normalized = comuna_nombre.lower().strip()
        return cls.COMUNA_ZONA_MAP.get(normalized, 'RM')  # Default a RM si no encuentra

    @classmethod
    def calcular_costo(cls, comuna, courier):
        """
        Calcula el costo estimado.
        Retorna: (precio_estimado, zona_detectada)
        """
        if courier == 'OTRO':
            return 0, None

        zona = cls.get_zona_from_comuna(comuna)
        precio_base = cls.ZONA_PRECIOS.get(zona, 4500)
        multiplicador = cls.COURIER_MULTIPLIERS.get(courier, 1.0)

        costo_final = int(precio_base * multiplicador)
        return costo_final, zona
