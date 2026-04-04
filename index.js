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
  // Auto-detect by hour — use CST (UTC-6) since Mexico no longer observes DST
  const cstHour = (new Date().getUTCHours() - 6 + 24) % 24;
  return (cstHour >= 5 && cstHour < 12) ? 'morning' : 'night';
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

  // Guard against GitHub Actions cron delay: if GH queued this job hours late,
  // the UTC time will be far outside the expected send window — skip silently.
  // Night crons fire at ~04:00–05:18 UTC; morning crons at ~12:40–13:50 UTC.
  // Windows are generous (±4 h) to tolerate normal GH scheduling lag.
  if (process.env.CI) {
    const utcHour = new Date().getUTCHours();
    const inWindow = mode === 'morning'
      ? utcHour >= 10 && utcHour < 18   // 04:00–12:00 CST
      : utcHour >= 0 && utcHour < 10;   // 18:00–04:00 CST
    if (!inWindow) {
      console.log(`[${new Date().toISOString()}] Skipping: ${mode} mode at UTC ${utcHour}h is outside expected window (likely a delayed GitHub Actions run).`);
      process.exit(0);
    }
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

  // 5. Connect with auto-reconnect on restartRequired (515).
  //
  // Race condition guard: Baileys often fires connection='open' followed almost
  // immediately by connection='close'/restartRequired (515). If we send on the
  // first 'open' and restartRequired fires mid-send, the text can be dropped by
  // WA while the sticker (sent on reconnect) goes through. Fix: capture the
  // socket reference per-iteration and use a `restarting` flag so the 'open'
  // handler bails out if a restart was triggered concurrently.
  let done = false;
  let currentSock = sock;

  while (!done) {
    const sockThisRound = currentSock;
    let restarting = false;

    const result = await new Promise((resolve, reject) => {
      sockThisRound.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('Scan this QR code with WhatsApp on your phone:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.restartRequired) {
            restarting = true;
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
            await sockThisRound.sendMessage(config.recipientId, { text: message });
            if (restarting) return; // restartRequired fired during text send — retry on new socket
            console.log(`[${new Date().toISOString()}] Text sent.`);

            await sockThisRound.sendMessage(config.recipientId, { sticker: stickerBuffer });
            if (restarting) return;
            console.log(`[${new Date().toISOString()}] Sticker sent.`);

            resolve('done');
          } catch (err) {
            if (!restarting) reject(err);
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
