# Reporte de Incidencia: Fail en Envío de Correos (SMTP)

**Fecha:** 10 de Diciembre, 2025  
**Estado:** Resuelto (Diagnóstico Completado)  
**Severidad:** Alta (Bloqueo total de notificaciones)

## 1. Descripción del Problema
Al intentar enviar cotizaciones desde el sistema en una nueva PC ("Environment B"), el servidor arroja un error 500.

**Error Log:**
```
TimeoutError: [WinError 10060] Se produjo un error durante el intento de conexión ya que la parte conectada no respondió adecuadamente...
File "smtplib.py", line 262, in __init__
    (code, msg) = self.connect(host, port)
```

**Interpretación:**
Python no logra establecer ni siquiera una conexión TCP con `smtp.gmail.com` en el puerto `587`. La solicitud "muere" antes de recibir respuesta, lo que indica un **bloqueo silencioso** (DROP packet) típico de Firewalls o Antivirus.

---

## 2. Diagnóstico Técnico

Se creó un script de aislamiento (`test_smtp_connection.py`) para probar la conectividad fuera de Django.

### Resultados de las Pruebas:
| Prueba | Detalle | Resultado |
| :--- | :--- | :--- |
| **DNS** | Resolver IP de `smtp.gmail.com` | ✅ **EXITO** (IP: 64.233.186.108) |
| **TCP Puerto 587** | Conexión Socket (TLS Estándar) | ❌ **FALLO (TIMEOUT)** |
| **TCP Puerto 465** | Conexión Socket (SSL Legacy) | ✅ **EXITO** |

### Causa Raíz:
El **Antivirus (Avast/AVG/McAfee)** o el **Firewall de la red** tiene una regla activa de "Mail Shield" que impide que aplicaciones desconocidas (como `python.exe`) envíen tráfico SMTP por el puerto estándar 587.

---

## 3. Soluciones Propuestas

### Solución A: Cambiar Estrategia de Conexión (Recomendada)
Dado que el puerto 465 está abierto, podemos configurar Django para usar SSL implícito en lugar de STARTTLS.

**Archivo:** `backend/clarotec_api/settings.py`
```python
# Configuración Anterior (Bloqueada)
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True

# Configuración Nueva (Funcional)
EMAIL_PORT = 465
EMAIL_USE_SSL = True   # Nota: Cambia de TLS a SSL
EMAIL_USE_TLS = False
```

### Solución B: Excepción en Antivirus (Si se requiere Puerto 587)
Si es obligatorio usar el puerto 587, se debe configurar el Antivirus en la PC afectada:
1.  Abrir **Avast/AVG/McAfee**.
2.  Ir a **Configuración -> Protección -> Escudo de Correo**.
3.  Desactivar la opción *"Analizar correos salientes (SMTP)"*.
4.  O añadir `python.exe` y la carpeta del proyecto a la lista de **Excepciones**.

---

## 4. Script de Verificación Futura
Para futuras instalaciones en nuevas máquinas, ejecutar este script antes de levantar el servidor:

```python
import socket

def check_ports():
    host = 'smtp.gmail.com'
    ports = [587, 465]
    print(f"Probando conexión a {host}...")
    
    for port in ports:
        try:
            socket.create_connection((host, port), timeout=3)
            print(f"✅ Puerto {port}: ABIERTO")
        except:
            print(f"❌ Puerto {port}: BLOQUEADO")

if __name__ == "__main__":
    check_ports()
```
