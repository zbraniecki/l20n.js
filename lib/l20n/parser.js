if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function (require, exports, module) {
  'use strict';

  function Parser(throwOnErrors) {

    /* Public */

    this.parse = parse;

    /* Private */

    var MAX_PLACEABLES = 100;

    var _source, _index, _length, _buffer;

    function str2ab(str) {
      var buf = new ArrayBuffer(str.length); // 2 bytes for each char
      var bufView = new Uint8Array(buf);
      for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return [buf, bufView];
    }

    function parse(str) {
      var x = str2ab(str);
      _buffer = x[0];
      _source = x[1];
      _length = x[1].length;
      _index = 0;
      return getLOL();
    }

    function getWS() {
      var cc = _source[_index];
      while (cc === 32 || cc === 10 || cc == 9 || cc == 13) {
        cc = _source[++_index];
      }
    }

    function getIdentifier() {
      var start = _index;
      var cc = _source[start];
      // a-zA-Z_
      if ((cc < 97 || cc > 122) && (cc < 65 || cc > 90) && cc !== 95) {
        throw error('Identifier has to start with [a-zA-Z_]');
      }

      cc = _source[++_index];
      while ((cc >= 97 && cc <= 122) || // a-z
          (cc >= 65 && cc <= 90) ||  // A-Z
          (cc >= 48 && cc <= 57) ||  // 0-9
          cc === 95) {               // _
            cc = _source[++_index];
          }
      return {
        type: 'Identifier',
          name: String.fromCharCode.apply(null, new Uint8Array(_buffer.slice(start, _index)))
      };
    }

    function getValue(optional, cc) {
      if (cc === 39 || cc === 34) {
        return getString(cc);
      }
    }

    function getString(opchar) {
      var len = 1;
      var start = _index + len;

      var pos = start;
      var cc = _source[pos];
      var i = 0;
      while (cc != opchar) {
        cc = _source[++pos];
      }
      var close = pos;

      var str = String.fromCharCode.apply(null, new Uint8Array(_buffer.slice(start, close)))
        _index = close + len;

      return {
        type: 'String',
          content: str
      }
    }

    function getEntity(id, index) {
      getWS();
      var cc = _source[_index];
      var value = getValue(true, cc);
      ++_index;
      return {
        type: 'Entity',
          id: id,
          value: value
      }
    }

    function getEntry() {
      var cc = _source[_index];
      if (cc === 60) {
        ++_index;
        var id = getIdentifier();
        return getEntity(id, []);
      }
    }

    function getLOL() {
      var entries = [];
      getWS();

      while(_index < _length) {
        entries.push(getEntry());
        if (_index < _length) {
          getWS();
        }
      }
      return {
        type: 'LOL',
          body: entries
      }
    }
  }

  exports.Parser = Parser;

});
