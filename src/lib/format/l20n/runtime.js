'use strict';

import { L10nError } from '../../errors';

const MAX_PLACEABLES = 100;

const L20nParser = {
  parse: function(string) {
    this._source = string;
    this._index = 0;
    this._length = string.length;
    this.entries = Object.create(null);

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
    let attrs;

    if (value === null) {
      if (ch === '>') {
        throw this.error('Expected ">"');
      }
      attrs = this.getAttributes();
    } else {
      const ws1 = this.getRequiredWS();
      if (this._source[this._index] !== '>') {
        if (!ws1) {
        console.log(this._source.slice(this._index));
          throw this.error('Expected ">"');
        }
        attrs = this.getAttributes();
      }
    }

    // skip '>'
    ++this._index;

    if (!attrs && !index && typeof value === 'string') {
      this.entries[id] = value;
    } else {
      this.entries[id] = {
        value,
        attrs,
        index
      };
    }
  },

  getValue: function(ch = this._source[this._index]) {
    let val;

    switch (ch) {
      case '\'':
      case '"':
        val = this.getString(ch, 1);
        break;
      case '{':
        val = this.getHash();
        break;
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
    let body = [];
    let buf = '';
    let placeables = 0;

    this._index += opcharLen - 1;

    let closed = false;

    while (!closed) {
      let ch = this._source[++this._index];
      
      switch (ch) {
        case '\\':
          const ch2 = this._source[++this._index];
          if (ch2 === 'u') {
            buf += this.getUnicodeChar();
          } else if (ch2 === opchar || ch2 === '\\') {
            buf += ch2;
          } else if (ch2 === '{' && this._source[this._index + 1] === '{') {
            buf += '{';
          } else {
            throw this.error('Illegal escape sequence');
          }
          break;
        case '{':
          if (this._source[this._index + 1] === '{') {
            if (placeables > MAX_PLACEABLES - 1) {
              throw this.error('Too many placeables, maximum allowed is ' +
                  MAX_PLACEABLES);
            }
            if (buf.length) {
              body.push(buf);
              buf = '';
            }
            this._index += 2;
            this.getWS();
            body.push(this.getExpression());
            this.getWS();
            if (!this._source.startsWith('}}', this._index)) {
              throw this.error('Expected "}}"');
            }
            this._index += 1;
            placeables++;
            break;
          }
        default:
          if (ch === opchar) {
            this._index++;
            closed = true;
            break;
          }

          buf += ch;
          if (this._index + 1 >= this._length) {
            throw this.error('Unclosed string literal');
          }
      }
    }

    if (body.length === 0) {
      return buf;
    }

    if (buf.length) {
      body.push(buf);
    }

    return body;
  },

  getAttributes: function() {
    const attrs = Object.create(null);

    while (true) {
      this.getAttribute(attrs);
      const ws1 = this.getRequiredWS();
      const ch = this._source.charAt(this._index);
      if (ch === '>') {
        break;
      } else if (!ws1) {
        throw this.error('Expected ">"');
      }
    }
    return attrs;
  },

  getAttribute: function(attrs) {
    const key = this.getIdentifier();
    let index;

    if (this._source[this._index]=== '[') {
      ++this._index;
      this.getWS();
      index = this.getItemList(this.getExpression, ']');
    }
    this.getWS();
    if (this._source[this._index] !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();
    const value = this.getValue();

    if (!index && typeof value === 'string') {
      attrs[key] = value;
    } else {
      attrs[key] = {
        value,
        index
      };
    }
  },

  getHash: function() {
    let items = Object.create(null);

    ++this._index;
    this.getWS();

    let defKey;

    while (true) {


      let [key, value, def] = this.getHashItem();
      if (typeof value === 'string') {
        items[key] = value;
      } else {
        items[key] = {
          value
        };
      }
      if (def) {
        defKey = key;
      }
      this.getWS();

      const comma = this._source[this._index] === ',';
      if (comma) {
        ++this._index;
        this.getWS();
      }
      if (this._source[this._index] === '}') {
        ++this._index;
        break;
      }
      if (!comma) {
        throw this.error('Expected "}"');
      }
    }

    if (defKey) {
      items['__default'] = defKey;
    }

    return items;
  },

  getHashItem: function() {
    let defItem = false;
    if (this._source[this._index] === '*') {
      ++this._index;
      defItem = true;
    }

    const key = this.getIdentifier();
    this.getWS();
    if (this._source[this._index] !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();

    return [key, this.getValue(), defItem];
  },

  getComment: function() {
    this._index += 2;
    const start = this._index;
    const end = this._source.indexOf('*/', start);

    if (end === -1) {
      throw this.error('Comment without a closing tag');
    }

    this._index = end + 2;
  },

  getExpression: function () {
    let exp = this.getPrimaryExpression();

    while (true) {
      let ch = this._source[this._index];
      if (ch === '.' || ch === '[') {
        ++this._index;
        exp = this.getPropertyExpression(exp, ch === '[');
      } else if (ch === '(') {
        ++this._index;
        exp = this.getCallExpression(exp);
      } else {
        break;
      }
    }

    return exp;
  },

  getPropertyExpression: function(idref, computed, start) {
    let exp;

    if (computed) {
      this.getWS();
      let exp = this.getExpression();
      this.getWS();
      if (this._source[this._index] !== ']') {
        throw this.error('Expected "]"');
      }
      ++this._index;
    } else {
      exp = this.getIdentifier();
    }

    return {
      t: 'prop',
      i: idref,
      p: exp,
      c: computed
    };
  },

  getCallExpression: function(callee, start) {
    this.getWS();

    return {
      t: 'call',
      c: callee,
      a: this.getItemList(this.getExpression, ')')
    };
  },

  getPrimaryExpression: function() {
    const start = this._index;
    const ch = this._source[this._index];

    switch (ch) {
      case '$':
        ++this._index;
        return {
          t: 'var',
          v: this.getIdentifier()
        };
        break;
      case '@':
        ++this._index;
        return {
          t: 'glob',
          v: this.getIdentifier()
        };
        break;
      default:
        return {
          t: 'id',
          v: this.getIdentifier()
        };
    }
  },

  error: function(message) {
    console.log(message);
    const pos = this._index;

    let start = this._source.lastIndexOf('<', pos - 1);
    let lastClose = this._source.lastIndexOf('>', pos - 1);
    start = lastClose > start ? lastClose + 1 : start;
    let context = '\x1b[90m' + this._source.slice(start, pos) + '\x1b[0m'; 
    context += this._source.slice(pos, pos + 10);

    let msg = message + ' at pos ' + pos + ': `' + context + '`';
    return new L10nError(msg);
  },
};

var source = '';
var l20nCode = read('./example.l20n');

for (var i = 0; i < 1000; i++) {
  source += l20nCode;
}

var entries = L20nParser.parse(source);
