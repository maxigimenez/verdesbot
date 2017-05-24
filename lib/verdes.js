'use strict';

var util = require('util');
var Bot = require('slackbots');
var dolarblue = require('dolar-blue');
var _ = require('underscore');
var normalize = require('../helpers/normalize');
var commands = require('../helpers/command');
var formatCurrency = require('format-currency');
var mysql = require('mysql');

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var VerdesBot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || 'verdesbot';
  this.user = null
};

util.inherits(VerdesBot, Bot);

VerdesBot.prototype.run = function () {
  VerdesBot.super_.call(this, this.settings);
  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

VerdesBot.prototype._onStart = function () {
  this._loadBotUser();
  this._connectDb();
  this._firstRunCheck();
};

VerdesBot.prototype._loadBotUser = function () {
  this.user = this.users.filter(function (user) {
    return user.name === this.name;
  }.bind(this))[0];
};

VerdesBot.prototype._connectDb = function () {
  var database = process.env.CLEARDB_DATABASE_URL;
  this.connection = mysql.createConnection(database);
  this.connection.connect();
};

VerdesBot.prototype._firstRunCheck = function () {
  this.connection.query('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
    if (err) {
      return console.error('DATABASE ERROR:', err);
    }
    var currentTime = (new Date()).toJSON();
    // this is a first run
    if (_.isEmpty(record)) {
      this._welcomeMessage();
      return this.connection.query('INSERT INTO info SET ?', {
        name: 'lastrun',
        val: currentTime
      });
    }
    // updates with new last running time
    this.connection.query('UPDATE info SET ? WHERE name = "lastrun"', {
      val: currentTime
    });
  }.bind(this));
};

VerdesBot.prototype._welcomeMessage = function () {
  this.postMessageToChannel(this.channels[0].name, 'Holis, en que te puedo ayudar?' +
      '\n Te puedo dar cotizaciones para esa persona que no bancas o para tus besties. Decime `verdes` o `' + this.name + '` y soy todo tuyo!',
      {
        as_user: true
      });
};

VerdesBot.prototype._onMessage = function (message) {
  if (this._isChatMessage(message) && !this._isFromVerdesBot(message) && this._isMentioningVerdes(message) ) {
    if (this._isChannelConversation(message)) {
      this._responseChannel(message);
    } else if (this._isGroupConversation(message)) {
      this._responseGroup(message);
    }
  }
};

VerdesBot.prototype._isChatMessage = function (message) {
  return message.type === 'message' && Boolean(message.text);
};

VerdesBot.prototype._isChannelConversation = function (message) {
  return typeof message.channel === 'string' && message.channel[0] === 'C';
};

VerdesBot.prototype._isGroupConversation = function (message) {
  return typeof message.channel === 'string' && message.channel[0] === 'G';
};

VerdesBot.prototype._isFromVerdesBot = function (message) {
  return message.user === this.user.id;
};

VerdesBot.prototype._isMentioningVerdes = function (message) {
  return message.text.toLowerCase().indexOf('verdes') > -1 || message.text.toLowerCase().indexOf(this.name) > -1;
};

VerdesBot.prototype._getChannelById = function (channelId) {
  return this.channels.filter(function (item) {
    return item.id === channelId;
  })[0];
};

VerdesBot.prototype._getGroupById = function (groupId) {
  return this.groups.filter(function (item) {
    return item.id === groupId;
  })[0];
};

VerdesBot.prototype._response = function (msg, cb) {
  var message = '';
  if (commands.isHelp(msg.text)) {
    message = 'Te puedo ofrecer estas opciones: \n\n';
    message += '`verdesbot hoy` _Cotizaciones del dia tanto oficial como de ambito financiero._\n';
    message += '`verdesbot vender 100` _Calcular a cuanto venderle a tu amigo o a esa persona que no bancas._\n';
    message += '`verdesbot historial` _Valor del dolar en los ultimos dias._\n';
    cb(message);
  } else if (commands.isToday(msg.text)) {
    dolarblue(_.bind(function (err, data) {
      var template = '*{{ source }}*\nCompra: {{ value_buy }} - Venta: {{ value_sell }}\n\n';
      var parsed = {};
      _.each(data.data, function (source) {
        if (_.contains(['ambito_financiero', 'oficial'], source.source)){
          parsed[source.source] = source;
          source.source = normalize.source(source.source);
          message += _.template(template)(source);
        }
      });

      var today = new Date();
      today = today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();

      this.connection.query('SELECT COUNT(*) as count FROM history WHERE date = "'+today+'"', _.bind(function (err, record) {
        if (record[0].count === 0) {
          // this.connection.query('INSERT INTO history(date, ambito_buy, ambito_sell, oficial_buy, oficial_sell) VALUES(?, ?, ?, ?, ?)', today, parsed.ambito_financiero.value_buy, parsed.ambito_financiero.value_sell, parsed.oficial.value_buy, parsed.oficial.value_sell);
          this.connection.query('INSERT INTO history SET ?', {
            date: today,
            ambito_buy: parsed.ambito_financiero.value_buy,
            ambito_sell: parsed.ambito_financiero.value_sell,
            oficial_buy: parsed.oficial.value_buy,
            oficial_sell: parsed.oficial.value_sell
          })
        }
      }, this));

      cb(message);
    }, this));
  } else if (commands.isSell(msg.text)) {
    dolarblue(function (err, data) {
      var amount = commands.extractSellNumber(msg.text);
      var template = '*{{ who }}*: {{ total }}\n';
      _.each(data.data, function (source) {
        if (_.contains(['ambito_financiero', 'oficial'], source.source)){
          message += _.template(template)({
            who: normalize.sell(source.source),
            total: formatCurrency(source.value_sell * amount, {
              format: '%s%v',
              symbol: '$'
            })
          });
        }
      });
      cb(message);
    });
  } else if (commands.isHistory(msg.text)) {
    this.connection.query('SELECT * FROM history', function (err, records) {
      if(_.isEmpty(records)) {
        return cb('No tenemos información');
      }

      if (!_.isArray(records)) {
        records = [records];
      }

      _.each(records, function (record) {
        message += ':date: Fecha: *' + record.date + '*\n';
        message += '*Ambito Financiero* \n';
        message += 'Compra: '+record.ambito_buy+' - Venta: '+record.ambito_sell+'\n';
        message += '*Oficial* \n';
        message += 'Compra: '+record.oficial_buy+' - Venta: '+record.oficial_sell+'\n';
      });

      cb(message);
    });
  } else {
    cb('No te estaria entendiendo culia.');
  }
};

VerdesBot.prototype._responseChannel = function (originalMessage) {
  var channel = this._getChannelById(originalMessage.channel);
  this._response(originalMessage, function (message) {
    this.postMessageToChannel(channel.name, message, {
      as_user: true,
      mrkdwn: true
    })
  }.bind(this));
};

VerdesBot.prototype._responseGroup = function (originalMessage) {
  var group = this._getGroupById(originalMessage.channel);
  this._response(originalMessage, function (message) {
    this.postMessageToGroup(group.name, message, {
      as_user: true,
      mrkdwn: true
    })
  }.bind(this));
};

module.exports = VerdesBot;
