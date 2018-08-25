'use strict';

module.exports = {
  info: (message) => message.includes('info'),
  hoy: (message) => message.includes('hoy'),
  ayer: (message) => message.includes('ayer'),
  historial: (message) => message.includes('historial')
};
