#!/usr/bin/env node

'use strict';

var fs = require('fs');
var program = require('commander');

var L20nSerializer = require('../src/lib/format/l20n/serializer');


program
  .version('0.0.1')
  .usage('[options] [file]')
  .parse(process.argv);

function color(str, col) {
  if (program.color) {
    return str[col];
  }
  return str;
}

function logError(err) {
  var message  = ': ' + err.message.replace('\n', '');
  var name = err.name + (err.entry ? ' in ' + err.entry : '');
  console.warn(color(name, 'red') + message);
}

function print(type, err, data) {
  if (err) {
    return console.error('File not found: ' + err.path);
  }
  var result;
  try {
    result = L20nSerializer.serialize(JSON.parse(data));
  } catch (e) {
    logError(e);
  }
  console.log(result);
}

if (program.args.length) {
  var type = program.args[0].substr(program.args[0].lastIndexOf('.')+1);
  fs.readFile(program.args[0], print.bind(null, type));
} else {
  process.stdin.resume();
  process.stdin.on('data', print.bind(null, null));
}

