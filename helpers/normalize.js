'use strict';

module.exports = {
  source: (source) => {
    if (source === 'ambito_financiero') {
      return 'Ambito Financiero';
    } else if (source === 'oficial') {
      return 'Oficial';
    }
  }
};
