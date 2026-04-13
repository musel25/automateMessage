'use strict';

const path = require('path');

module.exports = {
  // WhatsApp ID of the recipient
  recipientId: '5218116596021@s.whatsapp.net',

  // ── Night (10:30 PM–midnight WEST) ───────────────────────────────────────
  night: {
    messages: [
      'buenas noches mi princesa, que descanses muchísimo y sueñes cosas bonitas 💖',
      'buenas noches mi amor, gracias por existir y hacer mis días mejores 💕',
      'que tengas una noche tranquila mi vida, te quiero muchísimo 🌙',
      'descansa bien corazón, mañana seguimos 🌸',
      'buenas noches mi cielo, que duermas entre algodones 💫',
      'que la noche te llegue suavecito mi amor, pienso en ti siempre 🌹',
      'buenas noches preciosa, te mando un abrazo enorme aunque estemos lejos 🤗',
      'descansa mucho mi vida, mañana será otro día bonito 💖',
      'buenas noches mi amor, que tus sueños sean tan dulces como tú 🌛',
      'ya es hora de dormir mi princesa, descansa bien que yo también me voy a soñar contigo 💕',
      'buenas noches mi cielo, hoy fue un buen día y tú eres parte de eso 🌙',
      'que descanses amor, me alegra mucho tenerte 💖',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'night'),
    maxDelayMs: 3 * 60 * 1000,
  },

  // ── Morning (7:00–9:00 AM WEST) ──────────────────────────────────────────
  morning: {
    messages: [
      'buenos días mi vida, que tu día sea tan bonito como eres tú 💖',
      'buenos días mi amor, pensé en ti lo primero que abrí los ojos 🌅',
      'buen día mi princesa, espero que hayas soñado algo bonito 🌸',
      'buenos días mi cielo, que hoy te vaya increíble ✨',
      'ya amaneció y lo primero que hago es mandarte un beso, buenos días mi amor 💕',
      'buenos días la más linda del mundo, que tengas un día maravilloso 🌞',
      'despierta corazón, un nuevo día para que brilles como siempre 🌹',
      'buenos días mi vida, te mando todo mi cariño desde acá 🤗',
      'buen día mi preciosa, que el día de hoy te traiga puras cosas bonitas 💫',
      'buenos días mi amor, ya extrañándote desde que me desperté 💖',
      'buen día mi princesa, espero que estés muy bien hoy y siempre 🌸',
      'buenos días mi cielo, lo mejor de despertar es poder saludarte 🌅',
    ],
    stickersDir: path.join(__dirname, 'stickers', 'morning'),
    maxDelayMs: 3 * 60 * 1000,
  },
};