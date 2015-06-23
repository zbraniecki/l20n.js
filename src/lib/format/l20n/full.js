'use strict';

import AST from './ast';

const MAX_PLACEABLES = 100;

const L20nParser = {
  parse: function(string) {
    this._source = string;
    this._index = 0;
    this._length = string.length;

    return this.getResource();
  },

  getResource: function() {
    let resource = new AST.Resource();

    this.getWS();
    while (this._index < this._length) {
      resource.body.push(this.getEntry());
      if (this._index < this._length) {
        this.getWS();
      }
    }

    return resource;
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

    return new AST.Entity(id, value, index, attrs);
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

    return new AST.Identifier(this._source.slice(start, this._index));
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

    const start = this._index + 1;

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
            buf += '{{';
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

    if (buf.length) {
      body.push(buf);
    }

    return new AST.String(this._source.slice(start, this._index - 1), body);
  },

  getAttributes: function() {
    let attrs = [];

    while (true) {
      let attr = this.getAttribute();
      attrs.push(attr);
      let ws1 = this.getRequiredWS();
      let ch = this._source.charAt(this._index);
      if (ch === '>') {
        break;
      } else if (!ws1) {
        throw this.error('Expected ">"');
      }
    }
    return attrs;
  },

  getAttribute: function() {
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
    return new AST.Attribute(key, this.getValue(), index);
  },

  getHash: function() {
    let hash = [];

    ++this._index;
    this.getWS();

    while (true) {
      let isDefItem = false;
      if (this._source[this._index] === '*') {
        ++this._index;
        isDefItem = true;
      }

      hash.push(this.getHashItem());
      this.getWS();

      let comma = this._source[this._index] === ',';
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

    return hash;
  },

  getHashItem: function() {
    const key = this.getIdentifier();
    this.getWS();
    if (this._source[this._index] !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();
    return new AST.HashItem(key, this.getValue());
  },

  getComment: function() {
    this._index += 2;
    const start = this._index;
    const end = this._source.indexOf('*/', start);

    if (end === -1) {
      throw this.error('Comment without a closing tag');
    }

    this._index = end + 2;
    return new AST.Comment(this._source.slice(start, end));
  },

  getExpression: function () {
  },

  getItemList: function(callback, closeChar) {
    let items = [];
    let closed = false;

    this.getWS();

    if (this._source[this._index] === closeChar) {
      ++this._index;
      closed = true;
    }

    while (!closed) {
      items.push(callback.call(this));
      this.getWS();
      let ch = this._source.charAt(this._index);
      switch (ch) {
        case ',':
          ++this._index;
          this.getWS();
          break;
        case closeChar:
          ++this._index;
          closed = true;
          break;
        default:
          throw this.error('Expected "," or "' + closeChar + '"');
          break;
      }
    }

    return items;
  },
};

var l20nCode = `
<brandShortName "Foo \\u12abA\\u12abB {{ n }} ">
`;

var source = '';

for (var i = 0; i < 1; i++) {
  source += l20nCode;
}

var ast = L20nParser.parse(source);

console.log(JSON.stringify(ast, null, 2));
