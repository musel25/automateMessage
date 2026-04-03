'use strict';

const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
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

async function main() {
  // 1. Random sleep (skipped on GitHub Actions — timing handled by cron schedule there)
  if (!process.env.CI) {
    const delayMs = randomInt(0, config.maxDelayMs);
    const delayMin = Math.round(delayMs / 60000);
    console.log(`[${new Date().toISOString()}] Sleeping ${delayMin} min before sending...`);
    await sleep(delayMs);
  }

  // 2. Pick message and sticker before booting the client (fail fast on bad config)
  const message = config.messages[randomInt(0, config.messages.length - 1)];
  const stickerPath = pickRandomSticker(config.stickersDir);
  console.log(`[${new Date().toISOString()}] Message: "${message}"`);
  console.log(`[${new Date().toISOString()}] Sticker: ${path.basename(stickerPath)}`);

  // 3. Init client with persistent session
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth'),
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  // 4. Wire events BEFORE initialize()
  client.on('qr', qr => {
    console.log('Scan this QR code with WhatsApp on your phone (+52 1 663 104 6329):');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log(`[${new Date().toISOString()}] Session authenticated.`);
  });

  client.on('auth_failure', msg => {
    console.error(`[${new Date().toISOString()}] Auth failed: ${msg}`);
    process.exit(1);
  });

  client.on('ready', async () => {
    console.log(`[${new Date().toISOString()}] Client ready. Sending...`);
    try {
      await client.sendMessage(config.recipientId, message);
      console.log(`[${new Date().toISOString()}] Text sent.`);

      // Resize to 512x512 and compress to stay under WhatsApp's 500KB sticker limit
      const stickerBuffer = await sharp(stickerPath, { animated: true })
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 40 })
        .toBuffer();
      const media = new MessageMedia('image/webp', stickerBuffer.toString('base64'), path.basename(stickerPath));
      await client.sendMessage(config.recipientId, media, { sendMediaAsSticker: true });
      console.log(`[${new Date().toISOString()}] Sticker sent.`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error sending:`, err);
    } finally {
      await client.destroy();
      console.log(`[${new Date().toISOString()}] Done.`);
      process.exit(0);
    }
  });

  // 5. Start
  await client.initialize();
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Fatal:`, err);
  process.exit(1);
});
