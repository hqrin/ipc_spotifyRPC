#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const entryPoint = path.join(projectRoot, 'src', 'cli', 'main.js');
const pidFile = path.join(__dirname, 'keep-alive.pid');
const stopFile = path.join(__dirname, 'stop-keep-alive');

let child = null;
let shuttingDown = false;

function writePid(pid) {
  fs.writeFileSync(pidFile, String(pid), 'utf8');
}

function removePid() {
  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }
}

function shouldStop() {
  return fs.existsSync(stopFile);
}

function clearStopFile() {
  if (fs.existsSync(stopFile)) {
    fs.unlinkSync(stopFile);
  }
}

function stopLauncher() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (child && child.pid) {
    try {
      process.kill(child.pid);
    } catch (error) {
      // ignore
    }
  }

  removePid();
  clearStopFile();
  console.log('[keep-alive] Detenido.');
  process.exit(0);
}

function startProcess() {
  if (shouldStop()) {
    clearStopFile();
    stopLauncher();
    return;
  }

  child = spawn(process.execPath, [entryPoint], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      SPOTIFY_DESIGN_MODE: 'token'
    }
  });

  child.unref();
  writePid(child.pid);

  child.on('exit', (code, signal) => {
    const reason = signal ? `por señal ${signal}` : `código ${code}`;
    console.log(`\n[keep-alive] El proceso terminó con ${reason}. Reiniciando...`);

    if (shouldStop()) {
      clearStopFile();
      stopLauncher();
      return;
    }

    startProcess();
  });

  child.on('error', (err) => {
    console.error('[keep-alive] Error al lanzar el proceso:', err.message);
    setTimeout(startProcess, 3000);
  });
}

process.on('SIGINT', () => {
  console.log('[keep-alive] Ctrl+C ignorado. Usa node script/stop-keep-alive.js para detenerlo.');
});

process.on('SIGTERM', () => {
  console.log('[keep-alive] Señal de cierre ignorada. Usa node script/stop-keep-alive.js para detenerlo.');
});

setInterval(() => {
  if (shouldStop()) {
    clearStopFile();
    stopLauncher();
  }
}, 1000);

console.log('[keep-alive] Servicio iniciado y mantenido vivo.');
console.log('[keep-alive] Para detenerlo, ejecuta: node script/stop-keep-alive.js');
startProcess();
