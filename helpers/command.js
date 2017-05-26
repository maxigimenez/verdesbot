'use strict';

module.exports = {
  isHelp: (message) => {
    return message.includes('help');
  },
  isToday: (message) => {
    return message.includes('hoy');
  },
  isSell: (message) => {
    const m = message.split(' ');
    return m[1] === 'vender' && parseInt(m[2]) > 0;
  },
  extractSellNumber: (message) => {
    const m = message.split(' ');
    return parseInt(m[2]);
  },
  isHistory: (message) => {
    return message.includes('historial');
  }
};
