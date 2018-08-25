'use strict';

const Bot = require('slackbots');
const mysql = require('mysql');
const dolarblue = require('dolar-blue');

const normalize = require('../helpers/normalize');
const commands = require('../helpers/command');
const formatCurrency = require('format-currency');

class VerdesBot extends Bot {

  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.settings.name = this.settings.name || 'verdesbot';
    this.user = null;
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  _onStart() {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
  }

  _loadBotUser() {
    this.user = this.users.find((user) => user.name === this.settings.name);
  }

  _connectDb() {
    this.connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL);
    this.connection.connect();
    this.connection.on('error', () => {
      this._connectDb();
    });
  }

  _firstRunCheck() {
    this.connection.query('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', (err, record) => {
      if (err) {
        return console.error('Database error: ${err}');
      }

      const currentTime = new Date().toJSON();
      if (record.length === 0) {
        this._welcomeMessage();
        return this.connection.query('INSERT INTO info SET ?', {
          name: 'lastrun',
          val: currentTime
        });
      }

      this.connection.query('UPDATE info SET ? WHERE name = "lastrun"', {
        val: currentTime
      });
    });
  }

  _welcomeMessage() {
    this.postMessageToChannel(this.channels[0].name, `Hola! usa @${this.settings.name} info`, {
      as_user: true
    });
  }

  _onMessage(message) {
    if (this._isChatMessage(message) && !this._isFromVerdesBot(message) && this._mentioned(message)) {
      if (this._isChannelConversation(message)) {
        this._responseChannel(message);
      } else if (this._isGroupConversation(message)) {
        this._responseGroup(message);
      }
    }
  }

  _isChatMessage(message) {
    return message.type === 'message' && Boolean(message.text);
  }

  _isChannelConversation(message) {
    return typeof message.channel === 'string' && message.channel[0] === 'C';
  }

  _isGroupConversation(message) {
    return typeof message.channel === 'string' && message.channel[0] === 'G';
  }

  _isFromVerdesBot(message) {
    return message.user === this.user.id;
  }

  _mentioned(message) {
    let handler;
    message = message.text.split(' ');
    if (Array.isArray(message)) {
      message = message[0];
      if (message.includes('<')) {
        message = message.replace(/[@<>]/g, '');
        message = this.users.find(user => user.id === message);
        if (message) {
          handler = message.name;
        }
      } else {
        handler = message;
      }
    }
    return handler === this.settings.name;
  }

  _getChannelById(channelId) {
    return this.channels.filter((item) => item.id === channelId)[0];
  }

  _getGroupById(groupId) {
    return this.groups.filter((item) => item.id === groupId)[0];
  }

  _response(message, cb) {
    let output = '';

    if (commands.info(message.text)) {
      output = 'Te puedo ofrecer estas opciones: \n\n';
      output += '`verdesbot hoy` _Cotización Oficial y Ambito Financiero._\n';
      output += '`verdesbot ayer` _Cotización Oficial y Ambito Financiero pero de ayer._\n';
      output += '`verdesbot historial` _Valor del dolar en los ultimos dias._\n';
      output += '`verdesbot info` _Comandos disponibles._\n';
      cb(output);
    } else if (commands.hoy(message.text)) {
      dolarblue((err, response) => {
        let { data } = response;
        let formated = {};
        data = data.filter(element => ['ambito_financiero', 'oficial'].includes(element.source));
        data = data
          .map(element => {
            element.source = normalize.source(element.source);
            output += `*${element.source}* \n`;
            output += `Compra: $${element.value_buy} - Venta: $${element.value_sell} \n\n`;
            return element;
          });
        
        const [
          { value_buy: ambito_buy, value_sell: ambito_sell },
          { value_buy: oficial_buy, value_sell: oficial_sell }
        ] = data;

        const _date = new Date();
        const date = `${_date.getDate()}/${(_date.getMonth() + 1)}/${_date.getFullYear()}`;

        this.connection.query(`SELECT COUNT(*) as count FROM history WHERE date = "${date}"`, (err, record) => {
          if (record[0].count === 0) {
            this.connection.query('INSERT INTO history SET ?', {
              date, ambito_buy, ambito_sell, oficial_buy, oficial_sell
            });
          }
        });

        cb(output);
      });
    } else if (commands.ayer(message.text)) {
      const today = new Date();
      let yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const date = `${yesterday.getDate()}/${(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;

      this.connection.query(`SELECT * FROM history WHERE date = "${date}" limit 1`, (err, record) => {
        if (!record.length) {
          return cb('Uh culiado, ni idea, me dejaste en offside.');
        }
        output += `:date: *${date}* \n\n`;
        output += `*Ambito Financiero* \n`;
        output += `Compra: $${record[0].ambito_buy} - Venta: $${record[0].ambito_sell} \n\n`;
        output += `*Oficial* \n`;
        output += `Compra: $${record[0].oficial_buy} - Venta: $${record[0].oficial_sell} \n\n`;

        cb(output);
      });
    } else if (commands.historial(message.text)) {
      cb('Tomá! <https://verdesbot-web.herokuapp.com/|Verdes Bot Web>')
    } else {
      cb(`Que lo que deci?, usa @${this.settings.name} info`);
    }
  }

  _responseChannel(originalMessage) {
    const channel = this._getChannelById(originalMessage.channel);
    this._response(originalMessage, (message) => {
      this.postMessageToChannel(channel.name, message, {
        as_user: true,
        mrkdwn: true
      })
    });
  }

  _responseGroup(originalMessage) {
    const group = this._getGroupById(originalMessage.channel);
    this._response(originalMessage, (message) => {
      this.postMessageToGroup(group.name, message, {
        as_user: true,
        mrkdwn: true
      })
    });
  }

}

module.exports = VerdesBot;
