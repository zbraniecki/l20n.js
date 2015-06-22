'use strict';

import AST from './ast';

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
    const value = this.getValue(index === null, ch);
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
          throw this.error('Expected ">"');
        }
        attrs = this.getAttributes();
      }
    }

    // skip '>'
    ++this._index;

    return new AST.Entity(id, value, index, attrs);
  },

  getValue: function(optional, ch) {
    let val;

    if (ch === '\'' || ch === '"') {
      val = this.getString(ch, 1);
    }

    if (val === undefined) {
      if (!optional) {
        throw this.error('Unknown value type');
      }
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

  getString: function(opchar, opcharLen) {
    const opcharPos = this._source.indexOf(opchar, this._index + opcharLen);

    if (opcharPos === -1) {
      throw this.error('Unclosed string literal');
    }

    const buf = this._source.slice(this._index + opcharLen, opcharPos);

    this._index = opcharPos + opcharLen;

    return new AST.String(buf);
  },

  getAttributes: function() {
    let attrs = [];

    while (true) {
      let attr = this.getKVPWithIndex();
      attrs[attr[0]] = attr[1];
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
};

var l20nCode = `
<brandShortName "Firefox OS">
`;

var source = '';

for (var i = 0; i < 1; i++) {
  source += l20nCode;
}

var ast = L20nParser.parse(source);

console.log(JSON.stringify(ast));
