#!/usr/bin/env node

'use strict';

require('colors');
var fs = require('fs');
var program = require('commander');
var prettyjson = require('prettyjson');

var lib = require('./lib');
var makeError = lib.makeError.bind(program);

program
  .version('0.0.1')
  .usage('[options] [file]')
  .option('-r, --raw', 'Print raw JSON')
  .option('-n, --no-color', 'Print errors to stderr without color')
  .option('-p, --position', 'Save nodes position')
  .parse(process.argv);


function print(type, err, data) {
  if (err) {
    return console.error('File not found: ' + err.path);
  }

  var ast;
  try {
    ast = lib.parse(type, data.toString(), program.position);
  } catch (e) {
    console.error(makeError(e));
    process.exit(1);
  }

  if (program.raw) {
    console.log(JSON.stringify(ast, null, 2));
  } else {
    console.log(prettyjson.render(ast, {
      keysColor: 'cyan',
      dashColor: 'cyan',
    }));
  }
}

if (program.args.length) {
  var type = program.args[0].substr(program.args[0].lastIndexOf('.') + 1);
  fs.readFile(program.args[0], print.bind(null, type));
} else {
  process.stdin.resume();
  process.stdin.on('data', print.bind(null, null));
}
