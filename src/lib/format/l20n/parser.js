'use strict';

var L10nError = require('../../errors').L10nError;

var unescape = require('querystring').unescape;

var MAX_PLACEABLES = 100;

var L20nParser = {
  _source: null,
  _index: null,
  _length: null,

  _patterns: {
    identifier: /[A-Za-z_]\w*/g,
    unicode: /\\u([0-9a-fA-F]{1,4})/g,
    controlChars: /\\([\\\n\r\t\b\f\{\}\"\'])/g,
    index: /@cldr\.plural\((\w+)\)/g,
    placeables: /\{\{\s*([^\s]*?)\s*\}\}/,
  },

  parse: function (ctx, string) {
    this._source = string;
    this._index = 0;
    this._length = this._source.length;

    return this.getL20n();
  },

  getAttributes: function() {
    var attrs = Object.create(null);
    var attr, ws1, ch;

    while (true) {
      attr = this.getKVPWithIndex();
      attrs[attr[0]] = attr[1];
      ws1 = this.getRequiredWS();
      ch = this._source.charAt(this._index);
      if (ch === '>') {
        break;
      } else if (!ws1) {
        throw this.error('Expected ">"');
      }
    }
    return attrs;
  },

  getKVP: function() {
    var key = this.getIdentifier();
    this.getWS();
    if (this._source.charAt(this._index) !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();
    return [key, this.getValue()];
  },

  getKVPWithIndex: function() {
    var key = this.getIdentifier();
    var index = null;

    if (this._source.charAt(this._index) === '[') {
      ++this._index;
      this.getWS();
      index = this.getIndex();
    }
    this.getWS();
    if (this._source.charAt(this._index) !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();
    return [
      key,
      this.getValue(false, undefined, index)
    ];
  },

  getHash: function() {
    ++this._index;
    this.getWS();
    var hi, comma, hash = Object.create(null);
    while (true) {
      hi = this.getKVP();
      hash[hi[0]] = hi[1];
      this.getWS();

      comma = this._source.charAt(this._index) === ',';
      if (comma) {
        ++this._index;
        this.getWS();
      }
      if (this._source.charAt(this._index) === '}') {
        ++this._index;
        break;
      }
      if (!comma) {
        throw this.error('Expected "}"');
      }
    }
    return hash;
  },

  unescapeString: function() {
    var ch = this._source.charAt(++this._index);
    var cc;
    if (ch === 'u') { // special case for unicode
      var ucode = '';
      for (var i = 0; i < 4; i++) {
        ch = this._source[++this._index];
        cc = ch.charCodeAt(0);
        if ((cc > 96 && cc < 103) || // a-f
            (cc > 64 && cc < 71) || // A-F
            (cc > 47 && cc < 58)) { // 0-9
              ucode += ch;
            } else {
              throw this.error('Illegal unicode escape sequence');
            }
      }
      return String.fromCharCode(parseInt(ucode, 16));
    }
    return ch;
  },

  getComplexString: function(opchar, opcharLen) {
    var body = null;
    var buf = '';
    var placeables = 0;
    var ch;

    this._index += opcharLen - 1;

    var start = this._index + 1;

    walkChars:
    while (true) {
      ch = this._source.charAt(++this._index);
      switch (ch) {
        case '\\':
          buf += this.unescapeString();
          break;
        case '{':
          /* We want to go to default unless {{ */
          /* jshint -W086 */
          if (this._source.charAt(this._index + 1) === '{') {
            if (body === null) {
              body = [];
            }
            if (placeables > MAX_PLACEABLES - 1) {
              throw this.error('Too many placeables, maximum allowed is ' +
                  MAX_PLACEABLES);
            }
            if (buf) {
              body.push(buf);
            }
            this._index += 2;
            this.getWS();
            body.push(this.getExpression());
            this.getWS();
            if (this._source.charAt(this._index) !== '}' ||
                this._source.charAt(this._index + 1) !== '}') {
                  throw this.error('Expected "}}"');
                }
            this._index += 1;
            placeables++;
            
            buf = '';
            break;
          }
        default:
          if (opcharLen === 1) {
            if (ch === opchar) {
              this._index++;
              break walkChars;
            }
          } else {
            if (ch === opchar[0] &&
                this._source.charAt(this._index + 1) === ch &&
                this._source.charAt(this._index + 2) === ch) {
              this._index += 3;
              break walkChars;
            }
          }
          buf += ch;
          if (this._index + 1 >= this._length) {
            throw this.error('Unclosed string literal');
          }
      }
    }
    if (body === null) {
      return buf;
    }
    if (buf.length) {
      body.push(buf);
    }
    return body;
  },

  getString: function(opchar, opcharLen) {
    var opcharPos = this._source.indexOf(opchar, this._index + opcharLen);
    var placeablePos, escPos, buf;

    if (opcharPos === -1) {
      throw this.error('Unclosed string literal');
    }
    buf = this._source.slice(this._index + opcharLen, opcharPos);

    placeablePos = buf.indexOf('{{');
    if (placeablePos !== -1) {
      return this.getComplexString(opchar, opcharLen);
    } else {
      escPos = buf.indexOf('\\');
      if (escPos !== -1) {
        return this.getComplexString(opchar, opcharLen);
      }
    }

    this._index = opcharPos + opcharLen;

    return buf;
  },

  getValue: function(optional, ch, index) {
    var val;

    if (ch === undefined) {
      ch = this._source.charAt(this._index);
    }
    if (ch === '\'' || ch === '"') {
      val = this.getString(ch, 1);
    } else if (ch === '{') {
      val = this.getHash();
    }

    if (val === undefined) {
      if (!optional) {
        throw this.error('Unknown value type');
      }
      return null;
    }

    if (index) {
      return {'$v': val, '$x': index};
    }

    return val;
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

  getWS: function() {
    var cc = this._source.charCodeAt(this._index);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
  },


  getIdentifier: function() {
    var reId = this._patterns.identifier;

    reId.lastIndex = this._index;

    var match = reId.exec(this._source);

    this._index = reId.lastIndex;

    return match[0];
  },

  getEntity: function(id, index) {
    var entity = {'$i': id};

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

  getEntry: function() {
    // 60 === '<'
    if (this._source.charCodeAt(this._index) === 60) {
      ++this._index;
      var id = this.getIdentifier();
      // 91 == '['
      if (this._source.charCodeAt(this._index) === 91) {
        ++this._index;
        return this.getEntity(id,
                         this.getIndex());
      }
      return this.getEntity(id, null);
    }
    throw this.error('Invalid entry');
  },

  getL20n: function() {
    var ast = [];

    this.getWS();
    while (this._index < this._length) {
      var e = this.getEntry();
      ast.push(e);

      if (this._index < this._length) {
        this.getWS();
      }
    }

    return ast;
  },

  getExpression: function() {
    var id = this.getIdentifier();

    return {t: 'idOrVar', v: id};
  },

  getIndex: function() {
    this.getWS();

    this._patterns.index.lastIndex = this._index;

    var match = this._patterns.index.exec(this._source);

    this._index = this._patterns.index.lastIndex;

    this.getWS();

    this._index++;

    return [{t: 'idOrVar', v: 'plural'}, match[1]];
  },

  parseString: function(str) {
    var chunks = str.split(this._patterns.placeables);
    var complexStr = [];

    var len = chunks.length;
    var placeablesCount = (len - 1) / 2;

    if (placeablesCount >= MAX_PLACEABLES) {
      throw new L10nError('Too many placeables (' + placeablesCount +
                          ', max allowed is ' + MAX_PLACEABLES + ')');
    }

    for (var i = 0; i < chunks.length; i++) {
      if (chunks[i].length === 0) {
        continue;
      }
      if (i % 2 === 1) {
        complexStr.push({t: 'idOrVar', v: chunks[i]});
      } else {
        complexStr.push(chunks[i]);
      }
    }
    return complexStr;
  },

  error: function(message, pos) {
    if (pos === undefined) {
      pos = this._index;
    }
    var start = this._source.lastIndexOf('<', pos - 1);
    var lastClose = this._source.lastIndexOf('>', pos - 1);
    start = lastClose > start ? lastClose + 1 : start;
    var context = this._source.slice(start, pos + 10);

    var msg = message + ' at pos ' + pos + ': "' + context + '"';
    return new L10nError(msg);
  }
};

module.exports = L20nParser;
