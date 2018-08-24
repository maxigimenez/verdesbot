#!/usr/bin/env node

'use strict';

const VerdesBot = require('../lib/verdes');

const token = process.env.BOT_API_KEY;
const name = process.env.BOT_NAME;

const verdesbot = new VerdesBot({
  token: token,
  name: name
});

verdesbot.run();
