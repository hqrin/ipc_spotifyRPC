# 🎧 Guía de Configuración - Spotify Design

## 📋 Dos Modos de Funcionamiento

### Opción 1: Modo IPC Custom (Recomendado)
- ✅ Conexión directa a Discord mediante IPC
- ✅ Actualiza tu Rich Presence en vivo en Discord
- ✅ No requiere configuración adicional
- ✅ Más seguro (no requiere token de usuario)

**Requisitos:**
- Discord debe estar abierto en tu PC
- Windows (usa IPC nativo)

**Uso:**
```bash
npm start
# Selecciona: Opción 1
```

---

### Opción 2: Modo Real con Token (Experimental)
- 🔗 Conexión directa a la API de Discord usando token de usuario
- 🔄 Actualiza tu perfil en vivo a través de la API REST
- ⚠️ Requiere token de usuario válido
- ⚠️ Viola los términos de servicio de Discord

**Requisitos:**
- Token de usuario de Discord
- Conexión a internet

**Uso:**
```bash
npm start
# Selecciona: Opción 2
```

---

## 🔑 Cómo Obtener tu Token de Discord

### ⚠️ ADVERTENCIA IMPORTANTE
Usar tokens de usuario en bots o scripts **viola los términos de servicio de Discord**. Solo úsalo en tu máquina local para desarrollo personal.

### Pasos:

1. **Abre Discord en tu navegador**
   - Ve a https://discord.com/app

2. **Abre las DevTools**
   - Presiona `F12` o `Ctrl+Shift+I`

3. **Ve a la consola**
   - Click en la pestaña "Console"

4. **Ejecuta este comando:**
   ```javascript
   window.localStorage.token
   ```

5. **Copia el token**
   - ⚠️ **NO** compartas este token con nadie

6. **Guarda en .env**
   - Crea un archivo `.env` en la raíz del proyecto
   - Añade: `USER_TOKEN=tu_token_aqui`

---

##  Estructura del .env

```env
# Token de usuario de Discord (solo para Opción 2)
USER_TOKEN=TOKEN...
```

---

## 🚀 Ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar el programa
npm start

# Selecciona el modo que desees
```

---

## 🛡️ Seguridad

- El `.env` está en `.gitignore` (no se sube a GitHub)
-  El token nunca se expone en logs públicos
-  Solo se usa localmente en tu máquina

**Pero recuerda:**
-  Nunca compartas tu token
-  Nunca lo guardes en repositorios públicos
-  Si lo expones accidentalmente, cámbialo en Discord
