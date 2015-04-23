/* global it, assert:true, describe */
/* global navigator */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var assert = require('assert');
  var L10n = {
    L20nParser: require('../../../../src/lib/format/l20n/parser')
  };
}

describe('L10n Parser', function() {

  describe('Simple strings', function() {
    it('string value with double quotes', function() {
      var ast = L10n.L20nParser.parse(null, '<id "string">');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('string value with single quotes', function() {
      var ast = L10n.L20nParser.parse(null, '<id \'string\'>');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('empty value', function() {
      var ast = L10n.L20nParser.parse(null, '<id "">');
      assert.equal(ast[0].$v, '');
    });
  });

  describe('Complex strings', function() {
    it('string with a placeable', function() {
      var ast = L10n.L20nParser.parse(null, '<id "test {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped double quote', function() {
      var ast = L10n.L20nParser.parse(null,
        '<id "test \\\" {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test " ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped placeable', function() {
      var ast = L10n.L20nParser.parse(null,
        '<id "test \\{{ var }} test2">');
      assert.strictEqual(ast[0].$v, 'test {{ var }} test2');
    });
  });

  describe('Overlays', function() {
    it('string value with HTML markup', function() {
      var ast = L10n.L20nParser.parse(null, 
        '<id "string <strong>foo</strong>">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with an entity', function() {
      var ast = L10n.L20nParser.parse(null, 
        '<id "string &nbsp; foo">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with a smaller sign', function() {
      var ast = L10n.L20nParser.parse(null, 
        '<id "string < foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });

    it('string value with an & sign', function() {
      var ast = L10n.L20nParser.parse(null, 
        '<id "string & foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });
  });

  describe('Hash values', function() {
    it('simple hash value', function() {
      var ast = L10n.L20nParser.parse(null, '<id {one: "One", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with default', function() {
      var ast = L10n.L20nParser.parse(null,
        '<id {one: "One", *many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
      assert.strictEqual(ast[0].$v.__default, 'many');
    });
  });

});
