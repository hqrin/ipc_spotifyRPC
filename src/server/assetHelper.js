const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

async function prepareAssetFromUrl(url, suggestedKey = 'asset', writeConfig = false) {
  if (!url || !url.startsWith('http')) return null;

  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const contentType = resp.headers['content-type'] || '';
    let ext = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    if (contentType.includes('gif')) ext = 'gif';

    const key = `${suggestedKey.replace(/[^a-z0-9-_]/gi, '_').toLowerCase()}_${md5(url).slice(0,8)}`;
    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const filename = `${key}.${ext}`;
    const filePath = path.join(assetsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(resp.data));

    // Optionally write to config.json
    if (writeConfig) {
      const cfgPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const parsed = JSON.parse(raw);
        // backup
        const bakPath = cfgPath + `.bak.${Date.now()}`;
        fs.writeFileSync(bakPath, raw, 'utf8');
        parsed.spotify = parsed.spotify || {};
        parsed.spotify.assetKey = key;
        fs.writeFileSync(cfgPath, JSON.stringify(parsed, null, 2), 'utf8');
      }
    }

    return { key, filePath };
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { prepareAssetFromUrl };
