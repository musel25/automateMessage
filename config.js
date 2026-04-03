'use strict';

const path = require('path');

module.exports = {
  // WhatsApp ID of the recipient
  recipientId: '5218116596021@c.us',

  // Pool of good-night messages in Spanish
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

  // Absolute path to the stickers folder (safe for cron — no relative paths)
  stickersDir: path.join(__dirname, 'stickers'),

  // Max random delay: 120 minutes in ms (cron fires at 22:30, delivery window 22:30–00:30)
  maxDelayMs: 0 //120 * 60 * 1000,
};
