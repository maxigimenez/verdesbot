module.exports = {
  isHelp: function (message) {
    return message.indexOf('help') > -1;
  },
  isToday: function (message) {
    return message.indexOf('hoy') > -1;
  },
  isSell: function (message) {
    var m = message.split(' ');
    return m[1] === 'vender' && parseInt(m[2]) > 0;
  },
  extractSellNumber: function (message) {
    var m = message.split(' ');
    return parseInt(m[2]);
  }
};