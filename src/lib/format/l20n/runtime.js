'use strict';

//var L10nError = require('../../errors').L10nError;

var MAX_PLACEABLES = 100;

var L20nParser = {
  _source: null,
  _index: null,
  _length: null,

  parse: function(string) {
    this._source = string;
    this._index = 0;
    this._length = string.length;
    this.entries = new Map();

    return this.getL20n();
  },

  getL20n: function() {

    this.getWS();
    while (this._index < this._length) {
      this.getEntry();

      if (this._index < this._length) {
        this.getWS();
      }
    }

    return this.entries;
  },

  getEntry: function() {
    // 60 === '<'
    if (this._source.charCodeAt(this._index) === 60) {
      ++this._index;
      var id = this.getIdentifier();
      return this.getEntity(id, null);
    }

    throw this.error('Invalid entry');
  },

  getEntity: function(id, index) {
    if (!this.getRequiredWS()) {
      throw this.error('Expected white space');
    }

    var ch = this._source.charAt(this._index);
    var value = this.getValue(index === null, ch);
    this.entries.set(id, value);
    var ws1 = this.getRequiredWS();
    if (this._source.charAt(this._index) !== '>') {
      if (!ws1) {
        throw this.error('Expected ">"');
      }
    }

    // skip '>'
    ++this._index;
  },

  getValue: function(optional, ch, index) {
    var val;

    if (ch === '\'' || ch === '"') {
      val = this.getString(ch, 1);
    }
    return val;
  },

  getWS: function() {
    var cc = this._source.charCodeAt(this._index);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
  },

  getRequiredWS: function() {
    var pos = this._index;
    var cc = this._source.charCodeAt(pos);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
    return this._index !== pos;
  },

  getIdentifier: function() {
    var start = this._index;
    var cc = this._source.charCodeAt(this._index);

    if ((cc >= 97 && cc <= 122) || // a-z
        (cc >= 65 && cc <= 90) ||  // A-Z
        cc === 95) {               // _
      cc = this._source.charCodeAt(++this._index);
    } else {
      throw this.error('Identifier has to start with [a-zA-Z_]');
    }

    while ((cc >= 97 && cc <= 122) || // a-z
           (cc >= 65 && cc <= 90) ||  // A-Z
           (cc >= 48 && cc <= 57) ||  // 0-9
           cc === 95) {               // _
      cc = this._source.charCodeAt(++this._index);
    }

    return this._source.slice(start, this._index);
  },

  getString: function(opchar, opcharLen) {
    var opcharPos = this._source.indexOf(opchar, this._index + opcharLen);

    if (opcharPos === -1) {
      throw this.error('Unclosed string literal');
    }
    var buf = this._source.slice(this._index + opcharLen, opcharPos);

    this._index = opcharPos + opcharLen;

    return buf;
  },
};

var source = '';
var l20nCode = read('./example.l20n');

for (var i = 0; i < 1000; i++) {
  source += l20nCode;
}

var entries = L20nParser.parse(source);
