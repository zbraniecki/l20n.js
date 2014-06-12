'use strict';

var Entity = require('./compiler').Entity;
var parse = require('./parser').parse;
var io = require('./platform/io');
var getPluralRule = require('./plurals').getPluralRule;

function Locale(id, ctx) {
  this.id = id;
  this.ctx = ctx;
  this.isReady = false;
  this.entries = {
    __plural: getPluralRule(id)
  };
}

Locale.prototype.getEntry = function L_getEntry(id) {
  /* jshint -W093 */

  var entries = this.entries;

  if (!entries.hasOwnProperty(id)) {
    return undefined;
  }

  if (entries[id] instanceof Entity) {
    return entries[id];
  }

  return entries[id] = new Entity(id, entries[id], entries);
};

Locale.prototype.getResource = function (url, cb, sync) {
  var path = url.replace('{{locale}}', this.id);
  var type = getURLType(url);

  switch (type) {
    case 'json':
      io.loadJSON(path, onJSONLoaded, sync);
      break;
    case 'properties':
      io.load(path, onPropLoaded.bind(this, cb), sync);
      break;
  }
}

function onPropLoaded(cb, err, source) {
  var ast = parse(ctx, source);
  this.addAST(ast);
  cb();
}

Locale.prototype.addAST = function(ast) {
  for (var id in ast) {
    if (ast.hasOwnProperty(id)) {
      this.entries[id] = ast[id];
    }
  }
};

Locale.prototype.getEntity = function(id, ctxdata) {
  var entry = this.getEntry(id);

  if (!entry) {
    return null;
  }
  return entry.valueOf(ctxdata);
};

exports.Locale = Locale;
