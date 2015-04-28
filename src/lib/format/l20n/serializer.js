'use strict';

var L10nError = require('../../errors').L10nError;

var L20nSerializer = {
  serialize: function(ast) {
    var string = '';
    for (var id in ast) {
      string += this.dumpEntry(ast[id]) + '\n';
    }
    return string;
  },

  dumpEntry: function(entry) {
    return this.dumpEntity(entry);
  },

  dumpEntity: function(entity) {
    var id, val = null, attrs = {};
    var index = '';

    for (var key in entity) {
      switch (key) {
        case '$v':
          val = entity.$v;
          break;
        case '$o':
          val = entity.$o;
          break;
        case '$x':
          index = this.dumpIndex(entity.$x);
          break;
        case '$i':
          id = this.dumpIdentifier(entity.$i);
          break;
        default:
          attrs[key] = entity[key];
      }
    }

    if (Object.keys(attrs).length === 0) {
      return '<' + id + index + ' ' + this.dumpValue(val, 0) + '>';
    } else {
      return '<' + id + index + ' ' + this.dumpValue(val, 0) +
        '\n' + this.dumpAttributes(attrs) + '>';
    }
  },

  dumpIdentifier: function(id) {
    return id.replace(/-/g, '_');
  },

  dumpValue: function(value, depth) {
    if (value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return this.dumpString(value);
    }
    if (Array.isArray(value)) {
      return this.dumpComplexString(value);
    }
    if (typeof value === 'object') {
      if (value.$o) {
        return this.dumpValue(value.$o);
      }
      return this.dumpHash(value, depth);
    }
  },

  dumpString: function(str) {
    if (str) {
      return '"' + str.replace(/"/g, '\\"') + '"';
    }
    return '';
  },

  dumpComplexString: function(chunks) {
    var str = '"';
    for (var i = 0; i < chunks.length; i++) {
      if (typeof chunks[i] === 'string') {
        str += chunks[i];
      } else {
        str += '{{ ' + this.dumpExpression(chunks[i]) + ' }}';
      }
    }
    return str + '"';
  },

  dumpAttributes: function(attrs) {
    var str = '';
    for (var key in attrs) {
      if (attrs[key].$x) {
        str += '  ' + key + this.dumpIndex(attrs[key].$x) + ': ' +
          this.dumpValue(attrs[key].$v, 1) + '\n';
      } else {
        str += '  ' + key + ': ' + this.dumpValue(attrs[key], 1) + '\n';
      }
    }

    return str;
  },

  dumpExpression: function(exp) {
    if (exp.t === 'call') {
      return this.dumpCallExpression(exp);
    }

    return this.dumpPrimaryExpression(exp);
  },

  dumpCallExpression: function(exp) {
    var pexp = this.dumpPrimaryExpression(exp.v);

    var attrs = this.dumpItemList(exp.a, this.dumpExpression.bind(this));
    pexp += '(' + attrs + ')';
    return pexp;
  },

  dumpPrimaryExpression: function(exp) {
    var ret = '';

    switch (exp.t) {
      case 'glob':
        ret += '@';
        ret += exp.v;
        break;
      case 'var':
        ret += '$';
        ret += exp.v;
        break;
      case 'id':
        ret += exp.v;
        break;
      default:
        throw new L10nError('Unknown primary expression');
    }

    return ret;
  },

  dumpHash: function(hash, depth) {
    var items = [];
    var str;

    for (var key in hash) {
      str = '  ' + key + ': ' + this.dumpValue(hash[key]);
      items.push(str);
    }

    var indent = depth ? '  ' : ''; 
    return '{\n' + indent + items.join(',\n' + indent) + '\n'+indent+'}';
  },

  dumpItemList: function(itemList, cb) {
    var ret = '';

    return itemList.map(cb).join(', ');
  },
};

module.exports = L20nSerializer;
