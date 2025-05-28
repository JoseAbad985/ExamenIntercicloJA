
## 1. README.md
# Proyecto WebSocket con Docker Compose

Este proyecto demuestra una aplicación web completa que integra:
- **Frontend**: Aplicación web servida por Apache HTTP Server
- **Backend**: Servicio WebSocket independiente
- **Orquestación**: Docker Compose para gestionar ambos servicios

## Instalación y Ejecución

### Construir y ejecutar los servicios

```bash
# Construir las imágenes y ejecutar los contenedores
docker-compose up --build

# O ejecutar en segundo plano
docker-compose up --build -d
```

### 4. Acceder a la aplicación

- **Frontend**: http://localhost:8080
- **WebSocket Service**: ws://localhost:3000

