#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const stopFile = path.join(__dirname, 'stop-keep-alive');
const pidFile = path.join(__dirname, 'keep-alive.pid');

fs.writeFileSync(stopFile, '1', 'utf8');
console.log('[keep-alive] Se ha solicitado detener el servicio.');

if (fs.existsSync(pidFile)) {
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  try {
    process.kill(pid);
  } catch (error) {
    console.log('[keep-alive] El proceso ya no está en ejecución.');
  }
}
