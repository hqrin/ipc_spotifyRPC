const net = require('net');
const EventEmitter = require('events');

class DiscordIPC extends EventEmitter {
  constructor(clientId) {
    super();
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
    this.buffer = Buffer.alloc(0);
    this.heartbeatInterval = null;
    this.lastActivity = null;
  }

  getIPCPath(index = 0) {
    if (process.platform === 'win32') {
      return `\\\\.\\pipe\\discord-ipc-${index}`;
    }
    const envs = ['XDG_RUNTIME_DIR', 'TMPDIR', 'TMP', 'TEMP'];
    let prefix = '';
    for (const env of envs) {
      if (process.env[env]) {
        prefix = process.env[env];
        break;
      }
    }
    if (!prefix) prefix = '/tmp';
    return `${prefix}/discord-ipc-${index}`;
  }

  async connect() {
    if (this.socket) {
      this.socket.destroy();
    }
    this.buffer = Buffer.alloc(0);
    let connected = false;

    for (let i = 0; i < 10; i++) {
      const path = this.getIPCPath(i);
      try {
        await new Promise((resolve, reject) => {
          const socket = net.createConnection(path);
          
          socket.once('connect', () => {
            this.socket = socket;
            connected = true;
            resolve();
          });

          socket.once('error', (err) => {
            reject(err);
          });
        });
        
        if (connected) break;
      } catch (err) {
        // Try next pipe
      }
    }

    if (!connected) {
      throw new Error('Discord no está corriendo');
    }

    this.connected = false;
    this.setupListeners();
    this.send(0, { v: 1, client_id: this.clientId });
    this.startHeartbeat();
  }

  setupListeners() {
    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      
      while (this.buffer.length >= 8) {
        const op = this.buffer.readInt32LE(0);
        const len = this.buffer.readInt32LE(4);
        
        if (this.buffer.length >= 8 + len) {
          const payloadStr = this.buffer.toString('utf8', 8, 8 + len);
          this.buffer = this.buffer.subarray(8 + len);
          
          try {
            const payload = JSON.parse(payloadStr);
            if (op === 1) {
              this.emit('message', payload);
              if (payload && payload.evt === 'READY') {
                this.connected = true;
                this.emit('connect');
              }
            } else if (op === 3) {
              const nonce = payload && payload.nonce ? payload.nonce : undefined;
              this.send(4, { nonce });
            }
          } catch (err) {
            this.emit('error', new Error(`Failed to parse payload: ${err.message}`));
          }
        } else {
          break;
        }
      }
    });

    this.socket.on('error', (err) => {
      console.error('❌ Socket error:', err.message);
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.socket = null;
      this.stopHeartbeat();
      this.emit('disconnect');
    });
  }

  send(op, payload) {
    if (!this.socket) return;
    if (!this.connected && op !== 0 && op !== 3) return;
    try {
      const body = JSON.stringify(payload);
      const len = Buffer.byteLength(body);
      const header = Buffer.alloc(8);
      header.writeInt32LE(op, 0);
      header.writeInt32LE(len, 4);
      this.socket.write(Buffer.concat([header, Buffer.from(body)]));
    } catch (err) {
      this.emit('error', err);
    }
  }

  startHeartbeat(intervalMs = 30000) {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        const nonce = Math.random().toString();
        this.send(3, { nonce });
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setActivity(activity) {
    if (!this.connected) return;

    const activitySignature = JSON.stringify(activity);
    if (this.lastActivity === activitySignature) {
      return;
    }

    this.lastActivity = activitySignature;

    this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: {
          ...activity,
          type: 2
        }
      },
      nonce: Math.random().toString()
    });

    if (activity.details) {
      const line = `🎵 ${activity.details} - ${activity.state}`;
      process.stdout.write(`\r${line.padEnd(80)}`);
    }
  }

  clearActivity() {
    this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: null
      },
      nonce: Math.random().toString()
    });
  }

  close() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

module.exports = DiscordIPC;
