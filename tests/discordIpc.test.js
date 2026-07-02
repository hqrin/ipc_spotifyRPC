const test = require('node:test');
const assert = require('node:assert/strict');
const DiscordIPC = require('../src/server/discord-ipc');

test('DiscordIPC initializes with clientId', () => {
  const clientId = 'test-client-id';
  const ipc = new DiscordIPC(clientId);
  
  assert.equal(ipc.clientId, clientId);
  assert.equal(ipc.connected, false);
  assert.equal(ipc.lastActivity, null);
});

test('setActivity only updates on changes', () => {
  const ipc = new DiscordIPC('test-client');
  let callCount = 0;
  
  ipc.connected = true;
  ipc.send = (op, payload) => {
    if (op === 1 && payload.cmd === 'SET_ACTIVITY') {
      callCount++;
    }
  };

  // Primera actividad
  ipc.setActivity({
    details: 'Song A',
    state: 'Artist A',
    assets: { large_image: 'icon-a' }
  });

  // Misma actividad (no debería actualizar)
  ipc.setActivity({
    details: 'Song A',
    state: 'Artist A',
    assets: { large_image: 'icon-a' }
  });

  // Actividad diferente
  ipc.setActivity({
    details: 'Song B',
    state: 'Artist B',
    assets: { large_image: 'icon-b' }
  });

  assert.equal(callCount, 2, 'Should only update on changes');
});
