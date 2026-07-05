const test = require('node:test');
const assert = require('node:assert/strict');
const { createSpotifySong, buildPresencePayload } = require('../src/server/mockServer');

test('buildPresencePayload includes end timestamp by default (shows progress bar)', () => {
  const song = createSpotifySong();
  const payload = buildPresencePayload(song);
  const activity = payload.d.activities[0];

  assert.ok(activity.timestamps, 'timestamps should be present');
  assert.ok(typeof activity.timestamps.start === 'number', 'timestamps.start should be present');
  assert.ok(typeof activity.timestamps.end === 'number', 'timestamps.end should be present to show progress bar');
});
