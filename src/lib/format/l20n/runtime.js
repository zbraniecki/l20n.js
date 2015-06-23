'use strict';

import { L10nError } from '../../errors';

const MAX_PLACEABLES = 100;

var L20nParser = {
  parse: function(string) {
    this._source = string;
    this._index = 0;
    this._length = string.length;
    this.entries = new Map();

    return this.getResource();
  },

  getResource: function() {
    this.getWS();
    while (this._index < this._length) {
      try {
        this.getEntry();
      } catch (e) {
        if (e instanceof L10nError) {
          // we want to recover, but we don't need it in entries
          this.getJunkEntry();
        } else {
          throw e;
        }
      }

      if (this._index < this._length) {
        this.getWS();
      }
    }

    return this.entries;
  },

  getEntry: function() {
    if (this._source[this._index] === '<') {
      ++this._index;
      const id = this.getIdentifier();
      if (this._source[this._index] === '[') {
        ++this._index;
        return this.getEntity(id, this.getItemList(this.getExpression, ']'));
      }
      return this.getEntity(id);
    }

    if (this._source.startsWith('/*', this._index)) {
      return this.getComment();
    }

    throw this.error('Invalid entry');
  },

  getEntity: function(id, index) {
    if (!this.getRequiredWS()) {
      throw this.error('Expected white space');
    }

    const ch = this._source.charAt(this._index);
    const value = this.getValue(ch);
    const ws1 = this.getRequiredWS();
    if (this._source.charAt(this._index) !== '>') {
      if (!ws1) {
        throw this.error('Expected ">"');
      }
    }

    // skip '>'
    ++this._index;
    this.entries.set(id, value);
  },

  getValue: function(optional, ch, index) {
    let val;

    if (ch === '\'' || ch === '"') {
      val = this.getString(ch, 1);
    }
    return val;
  },

  getWS: function() {
    let cc = this._source.charCodeAt(this._index);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
  },

  getRequiredWS: function() {
    const pos = this._index;
    let cc = this._source.charCodeAt(pos);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
    return this._index !== pos;
  },

  getIdentifier: function() {
    const start = this._index;
    let cc = this._source.charCodeAt(this._index);

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

  getUnicodeChar: function() {
    for (let i = 0; i < 4; i++) {
      let cc = this._source.charCodeAt(++this._index);
      if ((cc > 96 && cc < 103) || // a-f
          (cc > 64 && cc < 71) ||  // A-F
          (cc > 47 && cc < 58)) {  // 0-9
        continue;
      }
      throw this.error('Illegal unicode escape sequence');
    }
    return String.fromCharCode(
      parseInt(this._source.slice(this._index - 3, this._index + 1), 16));
  },

  getString: function(opchar, opcharLen) {
    const opcharPos = this._source.indexOf(opchar, this._index + opcharLen);

    if (opcharPos === -1) {
      throw this.error('Unclosed string literal');
    }
    const buf = this._source.slice(this._index + opcharLen, opcharPos);

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
