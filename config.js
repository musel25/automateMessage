'use strict';

const path = require('path');

module.exports = {
  // WhatsApp ID of the recipient
  // recipientId: '5218116596021@s.whatsapp.net',
  recipientId: '5216631046329@s.whatsapp.net',

  // ── Night (22:30 cron, window 22:30–00:30) ────────────────────────────────
  night: {
    messages: [
      'Buenas noches mi princesa, que descanses mucho 💖',
      'Buenas noches mi amor, dulces sueños 💫',
      'Que tengas una noche llena de sueños bonitos, la amo mucho 🌸',
      'Descansa mucho mi vida, buenas noches 🌛',
      'Buenas noches mi amor preciosa, siempre pienso en usted 💕',
      'Que duermas muy bien esta noche, te mando un abrazo enorme 🤗',
      'Buenas noches princesa mía, hasta mañana 🌹',
      'Buenas noches mi cielo 💖',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'night'),
    // Max random delay: 120 min (cron fires at 22:30 → delivers 22:30–00:30)
    maxDelayMs: 0, //120 * 60 * 1000,
  },

  // ── Morning (07:00 cron, window 07:00–09:00) ──────────────────────────────
  morning: {
    messages: [
      'Buenos días mi princesa, que tengas un día muy bonito 💖',
      'Buenos días mi amor, espero que hayas dormido muy bien 🌞',
      'Buenos días mi cielo, ya pensando en usted 💕',
      'Buenos días princesa mía, que tu día sea tan bonita como tú 🌹',
      'Buenos días mi amor, un abrazo grande 🤗',
      'Buenos días mi reina, que tengas un día maravilloso ✨',
      'Buenos días, la amo mucho mucho 💫',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'morning'),
    // Max random delay: 120 min (cron fires at 07:00 → delivers 07:00–09:00)
    maxDelayMs: 0, //120 * 60 * 1000,
  },
};
