const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { loadConfig } = require('../src/server/configLoader');

test('loadConfig uses the server config file and exposes the configured icon', () => {
  const configPath = path.join(__dirname, '..', 'src', 'server', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  const config = loadConfig();

  assert.equal(config.spotify.icon, parsed.spotify.icon);
  assert.equal(config.spotify.albumArt, parsed.spotify.albumArt);
  assert.ok(config.spotify.icon || config.spotify.albumArt);
});
