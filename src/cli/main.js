const inquirer = require('inquirer');
const { startServer } = require('../server/index');

function resolveStartupMode() {
  const cliArg = process.argv.find((value) => value.startsWith('--mode='));
  if (cliArg) {
    return cliArg.split('=')[1];
  }

  if (process.env.SPOTIFY_DESIGN_MODE) {
    return process.env.SPOTIFY_DESIGN_MODE;
  }

  return undefined;
}

const banner = `
╔══════════════════════════════════════╗
║      SPOTIFY DESIGN - RICH PRESENCE   ║
║          by Hqrin - Hellsaq           ║
╚══════════════════════════════════════╝
`;

async function showMenu() {
  const startupMode = resolveStartupMode();

  if (startupMode) {
    startServer(startupMode);
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '🎵 Selecciona el modo de funcionamiento:',
      choices: [
        { name: '🔗 Opción 1: Modo IPC Custom (Discord IPC - Local)', value: 'ipc' },
        { name: '🎧 Opción 2: Modo Real con Token (API Discord - Conexión Real)', value: 'token' }
      ]
    }
  ]);

  startServer(answers.mode);
}

console.log(banner);
showMenu().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
