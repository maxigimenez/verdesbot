module.exports = {
  source: function (source) {
    if (source === 'ambito_financiero') {
      return 'Ambito Financiero';
    } else if (source === 'oficial') {
      return 'Oficial';
    }
  },
  sell: function (source) {
    if (source === 'ambito_financiero') {
      return 'Blue';
    } else if (source === 'oficial') {
      return 'Amigo';
    }
  }
};