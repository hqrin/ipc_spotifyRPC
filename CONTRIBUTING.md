# 🤝 Guía de Contribución

Gracias por tu interés en contribuir a **Spotify Discord Rich Presence**. Las contribuciones hacen que este proyecto sea mejor para todos.

---

## Cómo Contribuir

### 1. Fork & Clone

```bash
# Fork el repositorio desde GitHub
# Luego clona tu fork
git clone https://github.com/hqrin/ipc_spotifyRPC.git
cd spotify-design
git remote add upstream https://github.com/USUARIO_ORIGINAL/spotify-design.git
```

### 2. Crea una rama

```bash
# Actualiza main
git checkout main
git pull upstream main

# Crea tu rama de features
git checkout -b feature/tu-feature-nombre
# O para bugfixes
git checkout -b fix/tu-bugfix-nombre
```

### 3. Instala dependencias

```bash
npm install
```

### 4. Realiza cambios

- Edita los archivos necesarios
- Sigue el [Estilo de Código](#-estilo-de-código)
- Asegúrate que los tests pasen

```bash
npm test
```

### 5. Commit

```bash
# Mensajes descriptivos y en presente
git commit -m "Add: nueva feature de configuración"
git commit -m "Fix: corrige bug de reconexión"
git commit -m "Docs: actualiza README"
```

### 6. Push & Pull Request

```bash
git push origin feature/tu-feature-nombre
```

Luego abre un **Pull Request** en GitHub con:
- Título descriptivo
- Descripción de cambios
- Referencia a issues relacionados (#123)

---

##  Estilo de Código

### JavaScript

```javascript
// ✅ Bien
const connectDiscord = async (clientId) => {
  try {
    const socket = await createSocket();
    return socket;
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
};

// ❌ Evita
function connectDiscord(clientId){
  const s=createSocket()
  return s
}
```

### Normas

- **2 espacios** de indentación (NO tabs)
- **Const/let** no var
- **Arrow functions** cuando sea posible
- **Nombres descriptivos**: `configLoader` no `cfg`
- **Comentarios** para lógica compleja
- **Máximo 100 caracteres** por línea
- **Semicolons** al final de sentencias

### Archivos

```
src/
├── server/
│   └── moduleName.js         # camelCase
├── cli/
│   └── serviceSelector.js    # camelCase
└── tests/
    └── moduleName.test.js    # Sufijo .test.js
```

---

## 🧪 Pruebas

```bash
# Ejecuta toda la suite
npm test

# Con cobertura
npm test -- --coverage

# Un archivo específico
npm test -- src/tests/discord-ipc.test.js
```

**Requisitos:**
- Cubre cambios críticos
- Mínimo 80% de cobertura
- Usa Node.js testing API

Ejemplo:

```javascript
import test from 'node:test';
import assert from 'node:assert';

test('setActivity only updates on changes', async () => {
  const ipc = new DiscordIPC('123456789');
  
  // Simulate changes
  await ipc.setActivity({ details: 'Test' });
  
  // Verify behavior
  assert.strictEqual(ipc.lastActivity !== null, true);
});
```

---

## 📖 Documentación

- Actualiza **README.md** si cambias features públicas
- Añade **comments JSDoc** para funciones nuevas
- Documenta **nuevos archivos** de configuración

Ejemplo JSDoc:

```javascript
/**
 * Conecta a Discord mediante IPC
 * @param {string} clientId - ID de aplicación Discord
 * @returns {Promise<boolean>} True si conectó exitosamente
 * @throws {Error} Si falla la conexión
 */
async connect(clientId) {
  // ...
}
```

---

##  Checklist Antes de PR

- [ ] Tests pasan: `npm test`
- [ ] Código sigue el estilo
- [ ] README actualizado (si aplica)
- [ ] Sin conflictos con `main`
- [ ] Commits descriptivos
- [ ] No hay archivos temporales
- [ ] Funciona en Windows/Mac/Linux

---

##  Tipos de Contribuciones

### 🐛 Bug Reports

Abre un **Issue** con:
- Descripción clara del bug
- Pasos para reproducir
- Comportamiento esperado vs actual
- Sistema operativo & versión Node.js
- Logs/screenshots si aplica

###  Feature Requests

Abre un **Issue** con:
- Caso de uso
- Problema que resuelve
- Diseño propuesto
- Alternativas consideradas

### 📚 Documentación

- Ortografía y claridad
- Ejemplos prácticos
- Traducciones (si aplica)

---

##  Preguntas?

- **Discussions:** Para preguntas generales
- **Issues:** Para bugs y features

---

##  Tu Contribución Será

-  Reconocida en [CONTRIBUTORS.md](CONTRIBUTORS.md)
-  Mencionada en [CHANGELOG.md](CHANGELOG.md)
-  Valorada por la comunidad

---

<div align="center">

¡Gracias por mejorar este proyecto! 

</div>
