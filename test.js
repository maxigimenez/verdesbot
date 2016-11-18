var dolarblue = require('dolar-blue');
var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

dolarblue(function (err, data) {
  var output = '';
  var template = '*{{ source }}*\nCompra: {{ value_buy }} - Venta: {{ value_sell }}\n\n';
  _.each(data.data, function (source) {
    if (_.contains(['ambito_financiero', 'oficial'], source.source)){
      output += _.template(template)(source);
    }
  });
  console.log(output);
}.bind(this));