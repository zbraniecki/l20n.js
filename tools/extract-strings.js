#!/usr/bin/env node

'use strict';
const program = require('commander');
const fs = require('fs');
const cheerio = require('cheerio');

require('babel-register')({
  presets: ['es2015']
});
const AST = require('../src/lib/format/ftl/ast/ast').default;
const Serializer = require('../src/lib/format/ftl/ast/serializer').default;

function trimString(str) {
  return str.split('\n').map(line => {
    return line.trim();
  }).join('\n');
}

function extractFromHTML(err, data) {
  const res = new AST.Resource();

  const $ = cheerio.load(data.toString());
  const elements = $('*[data-l10n-id]');
  elements.each(function(index, element) {

    const id = new AST.Identifier($(this).attr('data-l10n-id'));
    const value = new AST.Pattern(trimString($(this).text().trim()));

    const traits = [];

    for (let i in element.attribs) {
      if (i === 'title') {
        const id = new AST.Identifier(i, 'html');
        const value = new AST.Pattern($(this).attr(i));
        const trait = new AST.Member(id, value);
        traits.push(trait);
      }
    }
    res.body.push(new AST.Entity(id, value, traits));
  });

  console.log(Serializer.serialize(res));
}

function extractFromJS(err, data) {
}


program
  .version('0.0.1')
  .usage('[options] [file]')
  .parse(process.argv);

if (program.args[0].endsWith('.html')) {
  fs.readFile(program.args[0], extractFromHTML);
}
if (program.args[0].endsWith('.js')) {
  fs.readFile(program.args[0], extractFromJS);
}