'use strict';

require('colors');
require('../../node_modules/babel-core/register');
var PropertiesParser =
  require('../../src/lib/format/properties/parser');
var L20nParser = require('../../src/lib/format/l20n/full');

exports.parse = function(type, text, pos) {
  switch (type) {
    case 'properties':
      return PropertiesParser.parse(null, text);
    case 'l20n':
      return L20nParser.parse(null, text, pos);
  }
};

exports.color = function(str, col) {
  if (this.color && col && str) {
    return str[col];
  }
  return str;
};

exports.makeError = function(err) {
  var message  = ': ' + err.message.replace('\n', '');
  var name = err.name + (err.entry ? ' in ' + err.entry : '');
  return exports.color.call(this, name + message, 'red');
};
