'use strict';

const path = require('path');

module.exports = {
  // WhatsApp ID of the recipient
  recipientId: '5218116596021@s.whatsapp.net',

  // ── Night (22:30 cron, window 22:30–00:30) ────────────────────────────────
  night: {
    messages: [
      'buenas noches mi princesa que descanses mucho 💖',
      'buenas noches mi amor dulces sueños 💫',
      'que tengas una noche llena de sueños bonitos la amo mucho 🌸',
      'descansa mucho mi vida buenas noches 🌛',
      'buenas noches mi amor preciosa siempre pienso en usted 💕',
      'que duermas muy bien hoy te mando un abrazo enorme 🤗',
      'descansa corazona hablamos mañana 🌹',
      'buenas noches mi cielo 💖',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'night'),
    // Retraso de hasta 120 min para que no parezca un bot
    maxDelayMs: 3 * 60 * 1000,
  },

  // ── Morning (07:00 cron, window 07:00–09:00) ──────────────────────────────
  morning: {
    messages: [
      'buenos dias mi princesa que tengas un dia muy bonito 💖',
      'buenos dias mi amor espero que hayas dormido muy bien 🌞',
      'buenos dias mi cielo ya pensando en usted 💕',
      'buen dia a la mas preciosinga',
      'buenos dias mi amor un abrazo grande 🤗',
      'buenos dias la amo mucho mucho 💫',
      'ola preciosa espero que hayas descansado 🌹',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'morning'),
    // Retraso de hasta 120 min
    maxDelayMs: 3 * 60 * 1000,
  },
};