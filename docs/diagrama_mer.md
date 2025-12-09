# Diagrama MER - Proyecto Clarotec

Para visualizar este diagrama, puedes usar la vista previa de Markdown en VS Code (`Ctrl+Shift+V`) si tienes una extensión compatible con Mermaid, o copiar el código de abajo en [Mermaid Live Editor](https://mermaid.live/).

```mermaid
erDiagram
    Roles ||--|{ User : "tiene asignados (1:N)"
    User ||--o{ Pedido : "gestiona / vende (1:N)"
    Cliente ||--o{ Pedido : "realiza / solicita (1:N)"
    Pedido ||--|{ ItemsPedido : "contiene (1:N)"
    ProductoFrecuente ||--o{ ItemsPedido : "es referenciado en (1:N)"

    Roles {
        int id PK
        string nombre "Único"
    }

    User {
        int id PK
        string email "Único"
        string password
        string first_name "Nombre"
        string last_name "Apellido"
        int rol_id FK "Opcional"
    }

    Cliente {
        int id PK
        string nombres
        string apellidos
        string email "Único"
        string telefono
        string empresa
        datetime fecha_creacion
        string retention_status "Estado Retención"
    }

    ProductoFrecuente {
        int id PK
        string nombre
        string descripcion
        decimal precio_referencia
        string categoria
        boolean activo
    }

    Pedido {
        int id PK
        int cliente_id FK
        int vendedor_asignado_id FK "Opcional"
        uuid id_seguimiento "Único (Portal)"
        string estado "Enum (Ej: Cotizado)"
        datetime fecha_solicitud
        decimal total_estimado
        json opciones_envio
        string region
        string comuna
    }

    ItemsPedido {
        int id PK
        int pedido_id FK
        int producto_frecuente_id FK "Opcional"
        string descripcion
        int cantidad
        decimal precio_unitario
        decimal subtotal
    }
```
