#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const entryPoint = path.join(projectRoot, 'src', 'cli', 'main.js');
const controlDir = path.join(__dirname, '.control');
const stateFile = path.join(controlDir, 'state.json');
const markerFile = path.join(controlDir, 'stop-marker');

if (!fs.existsSync(controlDir)) {
  fs.mkdirSync(controlDir, { recursive: true });
}

let activeChild = null;
let loopActive = true;

function saveState(payload) {
  fs.writeFileSync(stateFile, JSON.stringify(payload, null, 2), 'utf8');
}

function clearState() {
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

function readState() {
  if (!fs.existsSync(stateFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (error) {
    return null;
  }
}

function shouldStop() {
  return fs.existsSync(markerFile);
}

function removeMarker() {
  if (fs.existsSync(markerFile)) {
    fs.unlinkSync(markerFile);
  }
}

function stopLoop() {
  if (!loopActive) return;
  loopActive = false;
  removeMarker();
  clearState();

  if (activeChild && activeChild.pid) {
    try {
      process.kill(activeChild.pid, 'SIGTERM');
    } catch (error) {
      // ignore
    }
  }

  console.log('[keep-alive] Parado.');
  process.exit(0);
}

function launchChild() {
  if (!loopActive) return;
  if (shouldStop()) {
    removeMarker();
    stopLoop();
    return;
  }

  activeChild = spawn(process.execPath, [entryPoint], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      SPOTIFY_DESIGN_MODE: 'token'
    }
  });

  activeChild.unref();
  saveState({ pid: activeChild.pid, startedAt: Date.now() });

  activeChild.on('exit', () => {
    if (!loopActive) return;
    if (shouldStop()) {
      removeMarker();
      stopLoop();
      return;
    }
    setTimeout(launchChild, 1000);
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
    removeMarker();
    stopLoop();
  }
}, 1000);

console.log('[keep-alive] Servicio iniciado.');
console.log('[keep-alive] Para detenerlo, ejecuta: node script/stop-keep-alive.js');
launchChild();
