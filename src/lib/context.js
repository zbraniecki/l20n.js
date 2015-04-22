'use strict';

var L10nError = require('./errors').L10nError;
var EventEmitter = require('./events').EventEmitter;
var Locale = require('./locale').Locale;
var PSEUDO = require('./pseudo').PSEUDO;
var Resolver = require('./resolver');

function Context(id) {
  this.id = id;
  this.isReady = false;
  this.isLoading = false;

  this.defaultLocale = 'en-US';
  this.availableLocales = [];
  this.supportedLocales = [];
  this.qps = [];

  this.resLinks = [];
  this.locales = {};

  this._emitter = new EventEmitter();
  this._ready = new Promise(this.once.bind(this));
}


// Getting translations

function reportMissing(id, err) {
  this._emitter.emit('notfounderror', err);
  return id;
}

function getWithFallback(id) {
  /* jshint -W084 */
  var cur = 0;
  var loc;
  var locale;
  while (loc = this.supportedLocales[cur]) {
    locale = this.getLocale(loc);
    if (!locale.isReady) {
      // build without callback, synchronously
      locale.build(null);
    }
    var entry = locale.entries[id];
    if (entry === undefined) {
      cur++;
      reportMissing.call(this, id, new L10nError(
        '"' + id + '"' + ' not found in ' + loc + ' in ' + this.id,
        id, loc));
      continue;
    }
    return entry;
  }

  throw new L10nError(
    '"' + id + '"' + ' missing from all supported locales in ' + this.id, id);
}

function formatTuple(args, entity) {
  try {
    return Resolver.format(args, entity);
  } catch (err) {
    this._emitter.emit('resolveerror', err);
    var locals = {
      error: err
    };
    return [locals, entity.id];
  }
}

function formatValue(args, entity) {
  if (typeof entity === 'string') {
    return entity;
  }

  // take the string value only
  return formatTuple.call(this, args, entity)[1];
}

function formatEntity(args, entity) {
  var rv = formatTuple.call(this, args, entity);
  var locals = rv[0];
  var value = rv[1];

  var formatted = {
    value: value,
    attrs: null,
    overlay: locals.overlay
  };

  if (entity.attrs) {
    formatted.attrs = Object.create(null);
  }

  for (var key in entity.attrs) {
    /* jshint -W089 */
    formatted.attrs[key] = formatValue.call(this, args, entity.attrs[key]);
  }

  return formatted;
}

function formatAsync(fn, id, args) {
  return this._ready.then(
    getWithFallback.bind(this, id)).then(
      fn.bind(this, args),
      reportMissing.bind(this, id));
}

Context.prototype.formatValue = function(id, args) {
  return formatAsync.call(this, formatValue, id, args);
};

Context.prototype.formatEntity = function(id, args) {
  return formatAsync.call(this, formatEntity, id, args);
};

function legacyGet(fn, id, args) {
  if (!this.isReady) {
    throw new L10nError('Context not ready');
  }

  var entry;
  try {
    entry = getWithFallback.call(this, id);
  } catch (err) {
    // Don't handle notfounderrors in individual locales in any special way
    if (err.loc) {
      throw err;
    }
    // For general notfounderrors, report them and return legacy fallback
    reportMissing.call(this, id, err);
    // XXX legacy compat;  some Gaia code checks if returned value is falsy or
    // an empty string to know if a translation is available;  this is bad and
    // will be fixed eventually in https://bugzil.la/1020138
    return '';
  }

  // If translation is broken use regular fallback-on-id approach
  return fn.call(this, args, entry);
}

Context.prototype.get = function(id, args) {
  return legacyGet.call(this, formatValue, id, args);
};

Context.prototype.getEntity = function(id, args) {
  return legacyGet.call(this, formatEntity, id, args);
};

Context.prototype.getLocale = function getLocale(code) {
  /* jshint -W093 */

  var locales = this.locales;
  if (locales[code]) {
    return locales[code];
  }

  return locales[code] = new Locale(code, this);
};


// Getting ready

function negotiate(available, requested, defaultLocale) {
  var supportedLocale;
  // Find the first locale in the requested list that is supported.
  for (var i = 0; i < requested.length; i++) {
    var locale = requested[i];
    if (available.indexOf(locale) !== -1) {
      supportedLocale = locale;
      break;
    }
  }
  if (!supportedLocale ||
      supportedLocale === defaultLocale) {
    return [defaultLocale];
  }

  return [supportedLocale, defaultLocale];
}

function freeze(supported) {
  var locale = this.getLocale(supported[0]);
  if (locale.isReady) {
    setReady.call(this, supported);
  } else {
    locale.build(setReady.bind(this, supported));
  }
}

function setReady(supported) {
  this.supportedLocales = supported;
  this.isReady = true;
  this._emitter.emit('ready');
}

Context.prototype.registerLocales = function(defLocale, available) {

  if (defLocale) {
    this.defaultLocale = defLocale;
  }
  /* jshint boss:true */
  this.availableLocales = [this.defaultLocale];
  this.qps = Object.keys(PSEUDO);

  if (available) {
    for (var i = 0, loc; loc = available[i]; i++) {
      if (this.availableLocales.indexOf(loc) === -1) {
        this.availableLocales.push(loc);
        var pos = this.qps.indexOf(loc);
        if (pos !== -1) {
          // remove from this context's runtime pseudolocales
          this.qps.splice(pos, 1);
        }
      }
    }
  }
};

Context.prototype.requestLocales = function requestLocales() {
  if (this.isLoading && !this.isReady) {
    throw new L10nError('Context not ready');
  }

  this.isLoading = true;
  var requested = Array.prototype.slice.call(arguments);
  if (requested.length === 0) {
    throw new L10nError('No locales requested');
  }

  var supported = negotiate(
    this.availableLocales.concat(this.qps),
    requested,
    this.defaultLocale);

  // freeze only if the first language in the fallback chain is new
  if (this.supportedLocales[0] !== supported[0]) {
    freeze.call(this, supported);
  }
};


// Events

Context.prototype.addEventListener = function(type, listener) {
  this._emitter.addEventListener(type, listener);
};

Context.prototype.removeEventListener = function(type, listener) {
  this._emitter.removeEventListener(type, listener);
};

Context.prototype.ready = function(callback) {
  if (this.isReady) {
    setTimeout(callback);
  }
  this.addEventListener('ready', callback);
};

Context.prototype.once = function(callback) {
  /* jshint -W068 */
  if (this.isReady) {
    setTimeout(callback);
    return;
  }

  var callAndRemove = (function() {
    this.removeEventListener('ready', callAndRemove);
    callback();
  }).bind(this);
  this.addEventListener('ready', callAndRemove);
};

exports.Context = Context;
