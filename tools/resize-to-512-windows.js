const axios = require('axios');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

async function downloadAndResize(url) {
  if (!url || !url.startsWith('http')) {
    console.error('URL inválida');
    process.exit(1);
  }

  try {
    console.log('Descargando...', url);
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const buffer = Buffer.from(resp.data);

    const image = await Jimp.read(buffer);
    // redimensionar a 512x512 cortando/centrando (cover)
    image.cover(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);

    const assetsDir = path.resolve(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const key = `pc_${md5(url).slice(0,8)}`;
    const outPath = path.join(assetsDir, `${key}.png`);
    await image.writeAsync(outPath);
    console.log('Imagen convertida y guardada en:', outPath);
    console.log('Sugerencia: súbela en Discord Developer Portal y usa la key:', key);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
}

const defaultUrl = 'https://i.pinimg.com/736x/ab/64/2c/ab642cab7339b94240ad4c48004b8725.jpg';
const url = process.argv[2] || defaultUrl;
downloadAndResize(url);
