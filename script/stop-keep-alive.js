#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const controlDir = path.join(__dirname, '.control');
const markerFile = path.join(controlDir, 'stop-marker');
const stateFile = path.join(controlDir, 'state.json');

if (!fs.existsSync(controlDir)) {
  fs.mkdirSync(controlDir, { recursive: true });
}

fs.writeFileSync(markerFile, '1', 'utf8');
console.log('[keep-alive] Se ha solicitado detener el servicio.');

if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (state && state.pid) {
      try {
        process.kill(state.pid, 'SIGTERM');
      } catch (error) {
        // ignore
      }
    }
  } catch (error) {
    // ignore
  }
}
