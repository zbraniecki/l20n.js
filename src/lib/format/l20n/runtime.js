'use strict';

var L10nError = require('../../errors').L10nError;

var MAX_PLACEABLES = 100;

var L20nParser = {
  _source: null,
  _index: null,
  _length: null,

  parse: function(string, simple) {
    this._source = string;
    this._index = 0;
    this._length = this._source.length;

    return this.getL20n();
  },

  getL20n: function() {
    var ast = [];

    this.getWS();
    while (this._index < this._length) {
      var e = this.getEntry();
      if (e) {
        ast.push(e);
      }

      if (this._index < this._length) {
        this.getWS();
      }
    }

    return ast;
  },

  getEntry: function() {
    // 60 === '<'
    if (this._source.charCodeAt(this._index) === 60) {
      ++this._index;
      var id = this.getIdentifier();
      // 91 == '['
      if (this._source.charCodeAt(this._index) === 91) {
        ++this._index;
        return this.getEntity(id,
          this.getItemList(this.getExpression.bind(this), ']'));
      }
      return this.getEntity(id, null);
    }

    // 47,42 === /*
    if (this._source.charCodeAt(this._index) === 47 &&
        this._source.charCodeAt(this._index + 1) === 42) {
      return this.getComment();
    }
    throw this.error('Invalid entry');
  },

  getEntity: function(id, index) {
    var entity = Object.create(null);
    entity.$i = id;

    if (index) {
      entity.$x = index;
    }

    if (!this.getRequiredWS()) {
      throw this.error('Expected white space');
    }

    var ch = this._source.charAt(this._index);
    var value = this.getValue(index === null, ch);
    var attrs = null;
    if (value === null) {
      if (ch === '>') {
        throw this.error('Expected ">"');
      }
      attrs = this.getAttributes();
    } else {
      entity.$v = value;
      var ws1 = this.getRequiredWS();
      if (this._source.charAt(this._index) !== '>') {
        if (!ws1) {
          throw this.error('Expected ">"');
        }
        attrs = this.getAttributes();
      }
    }

    // skip '>'
    ++this._index;

    if (attrs) {
      /* jshint -W089 */
      for (var key in attrs) {
        entity[key] = attrs[key];
      }
    }

    return entity;
  },

  getValue: function(optional, ch, index) {
    var val;
    var overlay = false;

    if (ch === undefined) {
      ch = this._source.charAt(this._index);
    }
    if (ch === '\'' || ch === '"') {
      val = this.getString(ch, 1);
      overlay = val[1];
      val = val[0];
    } else if (ch === '{') {
      val = this.getHash();
    }

    if (val === undefined) {
      if (!optional) {
        throw this.error('Unknown value type');
      }
      return null;
    }

    if (index || overlay) {
      var value = Object.create(null);
      value.v = val;

      if (index) {
        value.x = index;
      }
      
      if (overlay) {
        value.o = true;
      }
      return value;
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

    var testPos = buf.indexOf('{{');
    if (testPos !== -1) {
      return this.getComplexString(opchar, opcharLen);
    }
    
    testPos = buf.indexOf('\\');
    if (testPos !== -1) {
      return this.getComplexString(opchar, opcharLen);
    }

    this._index = opcharPos + opcharLen;

    return [buf, this.isOverlay(buf)];
  },
};
