'use strict';

const fs = require('fs');
const path = require('path');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');
const config = require('./config');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomSticker(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp'));
  if (files.length === 0) {
    throw new Error(`No .webp sticker files found in: ${dir}`);
  }
  const chosen = files[randomInt(0, files.length - 1)];
  return path.join(dir, chosen);
}

function getMode() {
  const modeArg = process.argv.find(a => a.startsWith('--mode='));
  if (modeArg) return modeArg.split('=')[1];
  const idx = process.argv.indexOf('--mode');
  if (idx !== -1) return process.argv[idx + 1];
  // Auto-detect by hour if not specified
  const hour = new Date().getHours();
  return (hour >= 5 && hour < 12) ? 'morning' : 'night';
}

// Silent logger — suppresses Baileys' internal noise
const logger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {}, warn: () => {},
  error: () => {}, fatal: () => {}, child: () => logger,
};

async function main() {
  const mode = getMode();
  if (mode !== 'morning' && mode !== 'night') {
    console.error(`Unknown mode: "${mode}". Use --mode=morning or --mode=night`);
    process.exit(1);
  }

  const modeConfig = config[mode];
  console.log(`[${new Date().toISOString()}] Mode: ${mode}`);

  // 1. Random sleep (skipped on GitHub Actions — timing handled by cron schedule)
  if (!process.env.CI) {
    const delayMs = randomInt(0, modeConfig.maxDelayMs);
    const delayMin = Math.round(delayMs / 60000);
    console.log(`[${new Date().toISOString()}] Sleeping ${delayMin} min before sending...`);
    await sleep(delayMs);
  }

  // 2. Pick message and sticker before connecting (fail fast on bad config)
  const message = modeConfig.messages[randomInt(0, modeConfig.messages.length - 1)];
  const stickerPath = pickRandomSticker(modeConfig.stickersDir);
  console.log(`[${new Date().toISOString()}] Message: "${message}"`);
  console.log(`[${new Date().toISOString()}] Sticker: ${path.basename(stickerPath)}`);

  // 3. Compress sticker — try decreasing quality/size until under WhatsApp's 500KB limit
  const MAX_STICKER_BYTES = 500 * 1024;
  let stickerBuffer;
  outer: for (const size of [512, 384, 256]) {
    for (const quality of [40, 25, 15, 8]) {
      const buf = await sharp(stickerPath, { animated: true })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality })
        .toBuffer();
      if (buf.length <= MAX_STICKER_BYTES) {
        console.log(`[${new Date().toISOString()}] Sticker: ${(buf.length / 1024).toFixed(0)}KB (${size}px q${quality})`);
        stickerBuffer = buf;
        break outer;
      }
    }
  }
  if (!stickerBuffer) throw new Error('Could not compress sticker under 500KB');

  // 4. Connect to WhatsApp via Baileys (no browser needed)
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'auth_info_baileys')
  );

  // Fetch current WhatsApp Web version — fixes 405 handshake rejection
  const { version } = await fetchLatestBaileysVersion();
  console.log(`[${new Date().toISOString()}] WA version: ${version.join('.')}`);

  const sock = makeWASocket({ auth: state, version, logger });

  sock.ev.on('creds.update', saveCreds);

  // 5. Connect with auto-reconnect on restartRequired (515)
  let done = false;
  let currentSock = sock;

  while (!done) {
    const result = await new Promise((resolve, reject) => {
      currentSock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('Scan this QR code with WhatsApp on your phone:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.restartRequired) {
            console.log(`[${new Date().toISOString()}] Restart required — reconnecting...`);
            resolve('restart');
          } else if (code === DisconnectReason.loggedOut) {
            console.error(`[${new Date().toISOString()}] Session expired — delete auth_info_baileys/ and re-run.`);
            reject(new Error('Logged out'));
          } else {
            reject(new Error(`Connection closed (code ${code})`));
          }
        } else if (connection === 'open') {
          try {
            await currentSock.sendMessage(config.recipientId, { text: message });
            console.log(`[${new Date().toISOString()}] Text sent.`);

            await currentSock.sendMessage(config.recipientId, { sticker: stickerBuffer });
            console.log(`[${new Date().toISOString()}] Sticker sent.`);

            resolve('done');
          } catch (err) {
            reject(err);
          }
        }
      });
    });

    if (result === 'done') {
      done = true;
    } else {
      // restart: create a fresh socket and loop
      currentSock = makeWASocket({ auth: state, version, logger });
      currentSock.ev.on('creds.update', saveCreds);
    }
  }

  try { currentSock.end(); } catch (_) {}
  console.log(`[${new Date().toISOString()}] Done.`);
  process.exit(0);
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Fatal:`, err);
  process.exit(1);
});
