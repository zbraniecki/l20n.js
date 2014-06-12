'use strict';

var L10nError = require('./errors').L10nError;
var EventEmitter = require('./events').EventEmitter;
var Locale = require('./locale').Locale;

function Context(id) {

  this.id = id;
  this.isReady = false;

  this.supportedLocales = [];
  this.resLinks = [];
  this.locales = {};

  this._emitter = new EventEmitter();


  // Getting translations

  function getWithFallback(id) {
    /* jshint -W084 */

    if (!this.isReady) {
      throw new L10nError('Context not ready');
    }

    var cur = 0;
    var loc;
    var locale;
    while (loc = this.supportedLocales[cur]) {
      locale = this.getLocale(loc);
      if (!locale.isReady) {
        // build without callback, synchronously
        locale.build(null);
      }
      var entry = locale.getEntry(id);
      if (entry === undefined) {
        cur++;
        warning.call(this, new L10nError(id + ' not found in ' + loc, id,
                                         loc));
        continue;
      }
      return entry;
    }

    error.call(this, new L10nError(id + ' not found', id));
    return null;
  }

  this.get = function get(id, ctxdata) {
    var entry = getWithFallback.call(this, id);
    if (entry === null) {
      return '';
    }

    return entry.toString(ctxdata) || '';
  };

  this.getEntity = function getEntity(id, ctxdata) {
    var entry = getWithFallback.call(this, id);
    if (entry === null) {
      return null;
    }

    return entry.valueOf(ctxdata);
  };


  // Helpers

  this.getLocale = function getLocale(code) {
    if (!code) {
      code = this.supportedLocales[0];
    }

    if (this.locales[code]) {
      return this.locales[code];
    }

    return this.locales[code] = new Locale(code, this);
  };

  this.addResource = function (url, cb) {
    if (!this.isReady) {
      throw Error('Language negotiation not completed');
    }

    var locale = this.getLocale();

    this.resLinks.push(url);

    locale.getResource(url, cb);
  };

  // Getting ready

  this.negotiateLocales = function (available, requested, defaultLocale) {
    if (available.indexOf(requested[0]) === -1 ||
        requested[0] === defaultLocale) {
      this.supportedLocales = [defaultLocale];
    } else {
      this.supportedLocales = [requested[0], defaultLocale];
    }
    setReady.call(this);
  }

  function setReady() {
    this.isReady = true;
    this.getLocale().isReady = true;
    this._emitter.emit('ready');
  }

  // Events

  this.addEventListener = function addEventListener(type, listener) {
    this._emitter.addEventListener(type, listener);
  };

  this.removeEventListener = function removeEventListener(type, listener) {
    this._emitter.removeEventListener(type, listener);
  };

  this.ready = function ready(callback) {
    if (this.isReady) {
      setTimeout(callback);
    }
    this.addEventListener('ready', callback);
  };

  this.once = function once(callback) {
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


  // Errors

  function warning(e) {
    this._emitter.emit('warning', e);
    return e;
  }

  function error(e) {
    this._emitter.emit('error', e);
    return e;
  }
}

exports.Context = Context;
