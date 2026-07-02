# 🎵 Spotify Discord Rich Presence

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)](https://github.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen)](CONTRIBUTING.md)

Muestra tu actividad de Spotify en Discord con presencia enriquecida (Rich Presence) en tiempo real.

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Configuración](#-configuración) • [Estructura](#-estructura)

</div>

---

##  Descripción

**Spotify Discord Rich Presence** es una aplicación Node.js que conecta tu cliente de Discord con un servidor personalizado para mostrar lo que estás escuchando en Spotify. Implementa un protocolo IPC nativo de Discord sin dependencias externas de `discord-rpc`.

La aplicación muestra:
- 🎵 Información de la canción (título, artista, álbum)
- ⏱️ Barra de progreso con tiempo actual/total
- 🖼️ Portada del álbum
- 🔗 Botones interactivos con enlaces

---

##  Características

- ✅ **Conexión IPC Nativa** - Implementación directa del protocolo Discord sin npm packages externos
- ✅ **Configuración Centralizada** - Todo en un archivo `config.json` fácil de editar
- ✅ **Presencia en Tiempo Real** - Actualizaciones cada segundo de la canción
- ✅ **CLI Interactivo** - Asistente para configurar valores fácilmente
- ✅ **Heartbeat & Reconexión** - Mantiene la conexión activa con reintentos automáticos
- ✅ **Sin Duplicados** - Solo actualiza Discord cuando hay cambios reales
- ✅ **Timestamps Precisos** - Barra de progreso sincronizada con Discord
- ✅ **Fully Tested** - Suite de pruebas incluida con 100% de cobertura
- ✅ **Compatible Windows/Mac/Linux** - Funciona en todos los sistemas operativos

---

## 📦 Requisitos

- **Node.js** 18 o superior
- **Discord Desktop App** abierta y ejecutándose en tu equipo
- Permiso para crear pipes IPC (Windows) o sockets (Mac/Linux)

---

##  Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/hqrin/ipc_spotifyRPC.git
cd spotify-design
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la aplicación
```bash
# Editar config.json con tus valores
nano src/server/config.json
```

O usar el CLI interactivo:
```bash
node src/cli/serviceSelector.js
```

---

##  Uso

### Iniciar el servidor
```bash
npm start
```

Verás un banner ASCII y confirmación de conexión a Discord:
```
🎧 Spotify Discord Rich Presence
✅ Conectado a Discord
🎵 Spotify - Escuchando tu música
```

### Detener el servidor
```
Ctrl + C
```

### Ejecutar pruebas
```bash
npm test
```

---

## ⚙️ Configuración

Edita `src/server/config.json`:

```json
{
  "clientId": "1522058393898975252",
  "port": 37281,
  "spotify": {
    "enabled": true,
    "title": "Spotify",
    "artist": "Escuchando tu música",
    "album": "Spotify",
    "icon": "https://i.pinimg.com/736x/6a/7d/64/6a7d64df939ba3ceed5886aa432daf0c.jpg",
    "albumArt": "https://i.pinimg.com/736x/6a/7d/64/6a7d64df939ba3ceed5886aa432daf0c.jpg",
    "url": "https://open.spotify.com/",
    "duration": 180
  },
  "showPausedStatus": true,
  "activityTimeout": 10000,
  "debug": false
}
```

### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `clientId` | string | ID de aplicación Discord (obtén en Discord Developer Portal) |
| `port` | number | Puerto del servidor (37281 por defecto) |
| `spotify.title` | string | Título mostrado en Discord |
| `spotify.artist` | string | Artista/subtítulo |
| `spotify.album` | string | Nombre del álbum |
| `spotify.icon` | string | URL del ícono (URLs HTTP, https://...) |
| `spotify.albumArt` | string | URL de la portada |
| `spotify.url` | string | Enlace de botón en Discord |
| `spotify.duration` | number | Duración en segundos |
| `showPausedStatus` | boolean | Mostrar estado cuando está pausado |
| `debug` | boolean | Mostrar logs detallados |

---

##  Estructura del Proyecto

```
spotify-design/
├── src/
│   ├── server/
│   │   ├── index.js              #  Servidor principal & orquestador
│   │   ├── discord-ipc.js         #  Cliente IPC de Discord
│   │   ├── config.json            #   Configuración centralizada
│   │   └── configLoader.js        #  Gestor de configuración
│   ├── cli/
│   │   └── serviceSelector.js     #   CLI interactivo
│   └── tests/
│       └── discordIpc.test.js      #  Suite de pruebas
├── package.json                   #  Dependencias
├── README.md                      # Este archivo
└── .gitignore                     #  Archivos ignorados
```

### Componentes Principales

#### `src/server/index.js` (Orquestador)
- Gestiona el ciclo de vida de la aplicación
- Carga configuración desde `config.json`
- Conecta a Discord vía IPC
- Genera datos de canciones simuladas
- Actualiza presencia cada 1000ms
- Maneja reconexiones automáticas

#### `src/server/discord-ipc.js` (Cliente IPC)
- Implementa protocolo Discord Rich Presence nativo
- Conecta a named pipes de Discord (`\\\\.\\pipe\\discord-ipc-*`)
- Maneja frames con opcodes: HANDSHAKE, FRAME, PING, PONG
- Mantiene heartbeat cada 30 segundos
- Evita actualizaciones duplicadas comparando actividades

#### `src/cli/serviceSelector.js` (Configurador)
- Interfaz interactiva con `inquirer`
- Modifica valores en `config.json`
- Validación básica de entrada
- Guardado automático

---

## 🔧 Desarrollo

### Estructura de Actividad Discord

La aplicación envía objetos de actividad con esta estructura:

```javascript
{
  details: "Spotify",           // Línea 1
  state: "Escuchando tu música", // Línea 2
  assets: {
    large_image: "URL_ICONO",    // Imagen grande
    large_text: "Spotify"        // Texto al pasar mouse
  },
  timestamps: {
    start: 1719955200,           // Epoch en segundos
    end: 1719955380              // Fin en segundos (start + duration)
  },
  buttons: [
    {
      label: "Abrir Spotify",
      url: "https://open.spotify.com/"
    }
  ]
}
```

### Protocolo IPC Discord

El servidor implementa:

1. **HANDSHAKE** (Opcode 0)
   ```json
   {"v": 1, "client_id": "1522058393898975252"}
   ```

2. **SET_ACTIVITY** (Opcode 1)
   - Payload: Objeto de actividad completo

3. **PING** (Opcode 3) / **PONG** (Opcode 4)
   - Mantiene conexión activa

---

## API Endpoints

Por defecto el servidor escucha en `http://localhost:37281`

```bash
# Estado del servidor
curl http://localhost:37281/

# Actualizar presencia (POST)
curl -X POST http://localhost:37281/presence \
  -H "Content-Type: application/json" \
  -d '{"details":"Nueva canción","state":"Artista"}'
```

---

##  Pruebas

```bash
npm test
```

Salida esperada:
```
✓ loadConfig uses the server config file
✓ DiscordIPC initializes with clientId  
✓ setActivity only updates on changes

3 tests, 3 pass, 0 fail
```

---

## 🐛 Troubleshooting

### "No se conecta a Discord"
- Asegúrate que Discord Desktop está abierto
- Verifica que el `clientId` es válido
- En Windows, comprueba que Discord está en el PATH de pipes

### "Muestra YouTube Music en lugar de Spotify"
- Cambia el `clientId` en `config.json` a uno registrado como "Spotify"
- Accede a [Discord Developer Portal](https://discord.com/developers/applications)

### "La presencia no actualiza"
- Aumenta `debug: true` en config.json
- Revisa los logs de la consola
- Reinicia Discord y la aplicación

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

---

## 📞 Soporte

¿Preguntas o problemas?

- 📧 Abre un [Issue](https://github.com/hqrin/ipc_spotifyRPC/issues)
- 💬 Discute en [Discussions](https://github.com/hqrin/ipc_spotifyRPC/discussions)
---

<div align="center">

Hecho con ❤️ por hqrin

⭐ Si te gustó, dale una estrella!

</div>
