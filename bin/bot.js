#!/usr/bin/env node

'use strict';

const VerdesBot = require('../lib/verdes');
const { BOT_API_KEY: token, BOT_NAME: name } = process.env;
const verdesbot = new VerdesBot({ token, name });
verdesbot.run();
