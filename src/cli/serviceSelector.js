const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { loadConfig, saveConfig } = require('../server/configLoader');

const configPath = path.join(__dirname, '..', 'server', 'config.json');

function loadConfigFile() {
  return loadConfig(configPath);
}

async function main() {
  const config = loadConfigFile();
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Título de la canción:',
      default: config.spotify?.title || 'Spotify'
    },
    {
      type: 'input',
      name: 'artist',
      message: 'Artista:',
      default: config.spotify?.artist || 'Escuchando tu música'
    },
    {
      type: 'input',
      name: 'album',
      message: 'Álbum:',
      default: config.spotify?.album || 'Spotify'
    },
    {
      type: 'input',
      name: 'albumArt',
      message: 'URL del icono/logo de la canción o álbum:',
      default: config.spotify?.icon || config.spotify?.albumArt || ''
    }
  ]);

  const newConfig = {
    ...config,
    spotify: {
      ...config.spotify,
      title: answers.title,
      artist: answers.artist,
      album: answers.album,
      albumArt: answers.albumArt,
      icon: answers.albumArt
    }
  };

  saveConfig(newConfig, configPath);
  console.log('✅ Configuración de Spotify actualizada.');
}

main();
