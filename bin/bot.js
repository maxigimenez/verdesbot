#!/usr/bin/env node

'use strict';

var VerdesBot = require('../lib/verdes');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var verdesbot = new VerdesBot({
    token: token,
    dbPath: dbPath,
    name: name
});

verdesbot.run();