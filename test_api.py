import requests
import json

url = "http://127.0.0.1:8000/api/solicitudes/"
payload = {
    "cliente": {
        "nombre": "Test User",
        "email": "test@example.com",
        "empresa": "Test Corp",
        "telefono": "123456789"
    },
    "region": "Metropolitana",
    "comuna": "Santiago",
    "items": [
        {
            "tipo": "MANUAL",
            "descripcion": "Test Item",
            "cantidad": 1,
            "referencia": "",
            "producto_id": None
        }
    ]
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
