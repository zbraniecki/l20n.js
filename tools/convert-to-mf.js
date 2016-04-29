#!/usr/bin/env node

'use strict';

var fs = require('fs');
var program = require('commander');
var prettyjson = require('prettyjson');

var lib = require('./lib');

program
  .version('0.0.1')
  .usage('[options] [file]')
  .parse(process.argv);

function convertValue(value, shortHandVar) {
  if (typeof value === 'string') {
    return value;
  }

  let newValue = '';

  value.forEach(element => {
    if (Array.isArray(element)) {
      element.forEach(expression => {
        if (expression.type === 'ext') {
          if (expression.name === shortHandVar) {
            newValue += '#';
          } else {
            newValue += `{ ${expression.name} }`;
          }
        } else if (expression.type === 'ref') {
          newValue += `{ REF_${expression.name} }`;
        } else if (expression.type === 'sel') {
          let arg = expression.exp.args[0].name;
          let variants = '';
          expression.vars.forEach(variant => {
            let val = convertValue(variant.val, arg);
            variants += `${variant.key.name}{${val}} `;
          });
          newValue += `{${arg}, plural, ${variants}}`;
        }
      });
    } else if (typeof element === 'string') {
      newValue += element;
    }
  });

  return newValue;
}

function convert(err, data) {
  const result = {};
  const [entries, errors] = lib.parse('ftl', 'entries', data.toString());

  for(var key in entries) {
    let value = entries[key];
    //console.log(JSON.stringify(value));
    let newValue = convertValue(value);
    //console.log(newValue);

    result[key] = newValue;
  }

  const str = JSON.stringify(result, null, 2);
  console.log(str);
}

fs.readFile(program.args[0], convert);
