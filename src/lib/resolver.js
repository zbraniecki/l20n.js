'use strict';

import { L10nError } from './errors';

var KNOWN_MACROS = ['cldr.plural', 'i18n.localeFormat', 'gaia.formFactor'];
var MAX_PLACEABLE_LENGTH = 2500;
var rePlaceables = /\{\{\s*(.+?)\s*\}\}/g;

function createEntry(node, lang) {
  var keys = Object.keys(node);

  // the most common scenario: a simple string with no arguments
  if (typeof node.$v === 'string' && keys.length === 2) {
    return node.$v;
  }

  var attrs;

  /* jshint -W084 */
  for (var i = 0, key; key = keys[i]; i++) {
    if (key[0] === '$') {
      continue;
    }

    if (!attrs) {
      attrs = Object.create(null);
    }
    attrs[key] = createAttribute(node[key], lang, node.$i + '.' + key);
  }

  return {
    id: node.$i,
    value: node.$v !== undefined ? node.$v : null,
    index: node.$x || null,
    attrs: attrs || null,
    lang: lang,
    // the dirty guard prevents cyclic or recursive references
    dirty: false
  };
}

function createAttribute(node, lang, id) {
  if (typeof node === 'string') {
    return node;
  }

  return {
    id: id,
    value: node.$v || (node !== undefined ? node : null),
    index: node.$x || null,
    lang: lang,
    dirty: false
  };
}


function format(view, args, entity) {
  var locals = {
    overlay: false
  };

  if (typeof entity === 'string') {
    return [locals, entity];
  }

  if (entity.dirty) {
    throw new L10nError('Cyclic reference detected: ' + entity.id);
  }

  entity.dirty = true;

  var rv;

  // if format fails, we want the exception to bubble up and stop the whole
  // resolving process;  however, we still need to clean up the dirty flag
  try {
    rv = resolveValue(
      locals, view, entity.lang, args, entity.value, entity.index);
  } finally {
    entity.dirty = false;
  }
  return rv;
}

function resolveExpression(view, lang, args, exp) {
  switch (exp.t) {
    case 'id':
      return resolveIdentifier(view, lang, args, exp.v);
    case 'var':
      return resolveVariable(view, lang, args, exp.v);
    case 'glob':
      return resolveGlobal(view, lang, args, exp.v);
    case 'prop':
      return resolveProperty(view, lang, args, exp);
    case 'call':
      var idref = resolveExpression(view, lang, args, exp.v);
      var a = [resolveIdentifier.bind(this, view, lang, args)];
      for (var i in exp.a) {
        a.push(resolveExpression(view, lang, args, exp.a[i])[1]);
      }
      return idref[1].apply(idref[1], a);
  }
}

function resolveGlobal(view, lang, args, id) {
  if (KNOWN_MACROS.indexOf(id) > -1) {
    return [{}, view._getMacro(lang, id)];
  }

  throw new L10nError('Unknown reference: ' + id);
}

function resolveVariable(view, lang, args, id) {
  if (args && args.hasOwnProperty(id)) {
    if (typeof args[id] === 'string' || (typeof args[id] === 'number' &&
        !isNaN(args[id]))) {
      return [{}, args[id]];
    } else {
      throw new L10nError('Arg must be a string or a number: ' + id);
    }
  }

  throw new L10nError('Unknown reference: ' + id);
}

function resolveIdentifier(view, lang, args, id) {
  // XXX: special case for Node.js where still:
  // '__proto__' in Object.create(null) => true
  if (id === '__proto__') {
    throw new L10nError('Illegal id: ' + id);
  }

  var entity = view._getEntity(lang, id);

  if (entity) {
    return format(view, args, entity);
  }

  throw new L10nError('Unknown reference: ' + id);
}

function resolveProperty(view, lang, args, exp) {
  var entity = view._getEntity(lang, exp.e.v);

  entity.index = [exp.p];

  if (entity) {
    return format(view, args, entity);
  }
}

function subPlaceable(view, lang, args, exp) {
  var res;

  try {
    res = resolveExpression(view, lang, args, exp);
  } catch (err) {
    return [{ error: err }, '{{ ' + exp + ' }}'];
  }

  var value = res[1];

  if (typeof value === 'number') {
    return res;
  }

  if (typeof value === 'string') {
    // prevent Billion Laughs attacks
    if (value.length >= MAX_PLACEABLE_LENGTH) {
      throw new L10nError('Too many characters in placeable (' +
                          value.length + ', max allowed is ' +
                          MAX_PLACEABLE_LENGTH + ')');
    }
    return res;
  }

  return [{}, '{{ ' + exp + ' }}'];
}

function interpolate(locals, view, lang, args, arr) {
  return arr.reduce(function(prev, cur) {
    if (typeof cur === 'string') {
      return [prev[0], prev[1] + cur];
    } else {
      var placeable = subPlaceable(view, lang, args, cur);
      if (placeable[0].overlay) {
        prev[0].overlay = true;
      }
      return [prev[0], prev[1] + placeable[1]];
    }
  }, [locals, '']);
}

function resolveValue(locals, view, lang, args, expr, index) {
  if (!expr) {
    return [locals, expr];
  }

  if (expr.$o) {
    expr = expr.$o;
    locals.overlay = true;
  }

  if (typeof expr === 'string' ||
      typeof expr === 'boolean' ||
      typeof expr === 'number') {
    return [locals, expr];
  }

  if (Array.isArray(expr)) {
    return interpolate(locals, view, lang, args, expr);
  }

  // otherwise, it's a dict
  if (index) {
    // try to use the index in order to select the right dict member
    var selector = resolveExpression(view, lang, args, index[0]);
    if (Array.isArray(selector)) {
      selector = selector[1];
    }

    if (typeof(selector) === 'function') {
      selector = selector();
    }
    if (selector in expr) {
      return resolveValue(locals, view, lang, args, expr[selector]);
    }
  }

  // if there was no index or no selector was found, try 'other'
  if ('other' in expr) {
    return resolveValue(locals, view, lang, args, expr.other);
  }

  // XXX Specify entity id
  throw new L10nError('Unresolvable value');
}

export default { createEntry, format, rePlaceables };
