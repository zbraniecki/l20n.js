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


var parse = L10n.L20nParser.parse.bind(L10n.L20nParser);

describe('L10n Parser', function() {
  describe('Simple strings', function() {
    it('string value with double quotes', function() {
      var ast = parse(null, '<id "string">');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('string value with single quotes', function() {
      var ast = parse(null, '<id \'string\'>');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('empty value', function() {
      var ast = parse(null, '<id "">');
      assert.equal(ast[0].$v, '');
    });
  });

  describe('Complex strings', function() {
    it('string with a placeable', function() {
      var ast = parse(null, '<id "test {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped double quote', function() {
      var ast = parse(null, '<id "test \\\" {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test " ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped placeable', function() {
      var ast = parse(null, '<id "test \\{{ var }} test2">');
      assert.strictEqual(ast[0].$v, 'test {{ var }} test2');
    });
  });

  describe('Overlays', function() {
    it('string value with HTML markup', function() {
      var ast = parse(null, '<id "string <strong>foo</strong>">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with an entity', function() {
      var ast = parse(null, '<id "string &nbsp; foo">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with a smaller sign', function() {
      var ast = parse(null, '<id "string < foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });

    it('string value with an & sign', function() {
      var ast = parse(null, '<id "string & foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });

    it('complex string value with HTML markup', function() {
      var ast = parse(null, '<id "string <strong>{{ $n }}</strong>">');
      assert.strictEqual(ast[0].$v.v[0], 'string <strong>');
      assert.deepEqual(ast[0].$v.v[1], {t: 'var', v: 'n'});
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });
  });

  describe('Hash values', function() {
    it('simple hash value', function() {
      var ast = parse(null, '<id {one: "One", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with default', function() {
      var ast = parse(null, '<id {one: "One", *many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
      assert.strictEqual(ast[0].$v.__default, 'many');
    });

    it('hash value with redefined default', function() {
      assert.throws(function() {
        parse(null, '<id {*one: "One", *many: "Many"}>');
      }, /Default item redefinition forbidde/);
    });

    it('nested hash value', function() {
      var ast = parse(null, '<id {one: {oneone: "foo"}, many: "Many"}>');
      assert.strictEqual(ast[0].$v.one.oneone, 'foo');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with an overlay', function() {
      var ast = parse(null, '<id {one: "<b>test</b>", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one.v, '<b>test</b>');
      assert.strictEqual(ast[0].$v.one.t, 'overlay');
    });

    it('hash value with a complex string', function() {
      var ast = parse(null, '<id {one: "foo {{ $n }}", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one[0], 'foo ');
      assert.deepEqual(ast[0].$v.one[1], {t: 'var', v: 'n'});
    });
  });

  describe('Attributes', function() {
    it('simple attribute', function() {
      var ast = parse(null, '<id "foo" title: "Title">');
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('two attributes', function() {
      var ast = parse(null, '<id "foo" title: "Title" placeholder: "P">');
      assert.strictEqual(ast[0].title, 'Title');
      assert.strictEqual(ast[0].placeholder, 'P');
    });

    it('attribute with no value', function() {
      var ast = parse(null, '<id title: "Title">');
      assert.strictEqual(ast[0].$v, undefined);
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('attribute with an overlay value', function() {
      var ast = parse(null, '<id title: "Title &nbsp;">');
      assert.strictEqual(ast[0].title.v, 'Title &nbsp;');
      assert.strictEqual(ast[0].title.t, 'overlay');
    });

    it('attribute with a complex value', function() {
      var ast = parse(null, '<id title: "Title {{ $n }}">');
      assert.strictEqual(ast[0].title[0], 'Title ');
      assert.deepEqual(ast[0].title[1], {t: 'var', v: 'n'});
    });

    it('attribute with hash value', function() {
      var ast = parse(null, '<id title: {one: "One"}>');
      assert.strictEqual(ast[0].title.one, 'One');
    });

    it('attribute with hash value with a default', function() {
      var ast = parse(null, '<id title: {*one: "One"}>');
      assert.strictEqual(ast[0].title.one, 'One');
      assert.strictEqual(ast[0].title.__default, 'one');
    });

    it('attribute with a complex hash value with a default', function() {
      var ast = parse(null, '<id title: {*one: "One {{ $n }}"}>');
      assert.strictEqual(ast[0].title.one[0], 'One ');
      assert.deepEqual(ast[0].title.one[1], {t: 'var', v: 'n'});
      assert.strictEqual(ast[0].title.__default, 'one');
    });

    it('attribute with a complex hash value with a default and overlay',
      function() {

      var ast = parse(null, '<id title: {*one: "One&nbsp;{{ $n }}"}>');
      assert.strictEqual(ast[0].title.one.v[0], 'One&nbsp;');
      assert.deepEqual(ast[0].title.one.v[1], {t: 'var', v: 'n'});
      assert.deepEqual(ast[0].title.one.t, 'overlay');
      assert.strictEqual(ast[0].title.__default, 'one');
    });
  });

  describe('Index', function() {
    it('simple index', function() {
      var ast = parse(null, '<id[n] "foo">');
      assert.deepEqual(ast[0].$x, [{t: 'id', v: 'n'}]);
    });

    it('two level index', function() {
      var ast = parse(null, '<id[n, v] "foo">');
      assert.deepEqual(ast[0].$x[0], {t: 'id', v: 'n'});
      assert.deepEqual(ast[0].$x[1], {t: 'id', v: 'v'});
    });

    it('index on attribute', function() {
      var ast = parse(null, '<id title[n]: "foo">');
      assert.deepEqual(ast[0].title.x, [{t: 'id', v: 'n'}]);
    });

    it('two level index on attribute', function() {
      var ast = parse(null, '<id title[n, v]: "foo">');
      assert.deepEqual(ast[0].title.x[0], {t: 'id', v: 'n'});
      assert.deepEqual(ast[0].title.x[1], {t: 'id', v: 'v'});
    });
  });

  describe('Expressions', function() {
    it('identifier', function() {
      var ast = parse(null, '<id[n] "foo {{ n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'id', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'id', v: 'n'});
    });

    it('variable', function() {
      var ast = parse(null, '<id[$n] "foo {{ $n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'var', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'var', v: 'n'});
    });

    it('global', function() {
      var ast = parse(null, '<id[@n] "foo {{ @n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'glob', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'glob', v: 'n'});
    });

    it('complex id', function() {
      var ast = parse(null, '<id[@gaia.formFactor] "foo">');
      assert.deepEqual(ast[0].$x, [{t: 'glob', v: 'gaia.formFactor'}]);
    });

    it('call expression', function() {
      var ast = parse(null, '<id[@cldr.plural($n)] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'call');
      assert.strictEqual(ast[0].$x[0].v.t, 'glob');
      assert.strictEqual(ast[0].$x[0].v.v, 'cldr.plural');
      assert.deepEqual(ast[0].$x[0].a[0], {t: 'var', v: 'n'});
    });

    it('call expression with two params', function() {
      var ast = parse(null,
        '<id[@icu.formatDate($d, dateShortFormat)] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'call');
      assert.strictEqual(ast[0].$x[0].v.t, 'glob');
      assert.strictEqual(ast[0].$x[0].v.v, 'icu.formatDate');
      assert.deepEqual(ast[0].$x[0].a[0], {t: 'var', v: 'd'});
      assert.deepEqual(ast[0].$x[0].a[1], {t: 'id', v: 'dateShortFormat'});
    });
  });
});
