const { createSpotifySong, buildPresencePayload } = (() => {
  try {
    const mod = require('../src/server/mockServer');
    return { createSpotifySong: mod.createSpotifySong, buildPresencePayload: mod.buildPresencePayload };
  } catch (e) {
    // mockServer doesn't export buildPresencePayload; compute manually
    const mod = require('../src/server/mockServer');
    return { createSpotifySong: mod.createSpotifySong };
  }
})();

const song = createSpotifySong();
const start = Date.now() - Math.round(song.currentTime * 1000);
const end = Date.now() + Math.round((song.duration - song.currentTime) * 1000);
console.log('currentTime(s)=', song.currentTime);
console.log('start(ms)=', start, ' -> ', new Date(start).toISOString());
console.log('end(ms)=', end, ' -> ', new Date(end).toISOString());
