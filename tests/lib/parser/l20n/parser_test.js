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
  describe('Parser', function() {
    it('malformed entity errors', function() {
      var strings = [
        'd',
        '<',
        '<i',
        '<id',
        '<id<',
        '<id ',
        '<>',
        '<"">',
        '< "">',
        '< id>',
        '<id>',
        '<id>',
        '<id ">',
        '<id \'>',
        '<id ""',
        '<id <',
        '<<',
        '< <',
        '<!id',
        '<*id',
        '<id "value>',
        '<id value">',
        '<id \'value">',
        '<id \'value>',
        '<id value\'>',
        '<id"value">',
        '< id "value">',
        '<()>',
        '<+s>',
        '<id-id2>',
        '<-id>',
        '<"id">',
        '<\'id\'>',
        '<2>',
        '<09>',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse(strings[i]);
        });
      }
    });
  });

  describe('Simple strings', function() {
    it('string value with double quotes', function() {
      var ast = parse('<id "string">');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('string value with single quotes', function() {
      var ast = parse( '<id \'string\'>');
      assert.strictEqual(ast[0].$v, 'string');
    });

    it('empty value', function() {
      var ast = parse( '<id "">');
      assert.equal(ast[0].$v, '');
    });
  });

  describe('String escapes', function() {
    it('single doublequote escape', function() {
      var ast = parse( '<id "\\"">');
      assert.strictEqual(ast[0].$v, '"');
    });

    it('single singlequote escape', function() {
      var ast = parse( '<id \'\\\'\'>');
      assert.strictEqual(ast[0].$v, '\'');
    });

    it('single doublequote escape in the middle of a word', function() {
      var ast = parse( '<id "str\\"ing">');
      assert.strictEqual(ast[0].$v, 'str"ing');
    });

    it('single singlequote escape in the middle of a word', function() {
      var ast = parse( '<id "str\\\'ing">');
      assert.strictEqual(ast[0].$v, 'str\\\'ing');
    });

    it('escape a placeable', function() {
      var ast = parse( '<id "test \\{{ \\\"more\\\" }}">');
      assert.strictEqual(ast[0].$v, 'test {{ "more" }}');
    });

    it('escape on a second opchar of a placeable', function() {
      var ast = parse( '<id "test {\\{ var }}">');
      assert.strictEqual(ast[0].$v, 'test {\\{ var }}');
    });

    it('double escape before placeable', function() {
      var ast = parse( '<id "test \\\\{{ n }}">');
      assert.strictEqual(ast[0].$v[0], 'test \\');
      assert.deepEqual(ast[0].$v[1], {t: 'id', v: 'n'});
    });

    it('triple escape before placeable', function() {
      var ast = parse( '<id "test \\\\\\{{ n }}">');
      assert.strictEqual(ast[0].$v, 'test \\{{ n }}');
    });

    it('double escape', function() {
      var ast = parse( '<id "test \\\\ more">');
      assert.strictEqual(ast[0].$v, 'test \\ more');
    });

    it('escape a letter', function() {
      var ast = parse( '<id "test \\a more">');
      assert.strictEqual(ast[0].$v, 'test \\a more');
    });

    it('double escape at the end', function() {
      var ast = parse( '<id "test \\\\">');
      assert.strictEqual(ast[0].$v, 'test \\');
    });
  });

  describe('Unicode escapes', function() {
    it('simple unicode escape', function() {
      var ast = parse( '<id "string \\ua0a0 foo">');
      assert.strictEqual(ast[0].$v, 'string ꂠ foo');
    });

    it('unicode escapes before placeable and end', function() {
      var ast = parse( '<id "string \\ua0a0{{ foo }} foo \\ua0a0">');
      assert.strictEqual(ast[0].$v[0], 'string ꂠ');
      assert.strictEqual(ast[0].$v[2], ' foo ꂠ');
    });
  });

  describe('Complex strings', function() {
    it('string with a placeable', function() {
      var ast = parse( '<id "test {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped double quote', function() {
      var ast = parse( '<id "test \\\" {{ var }} test2">');
      assert.strictEqual(ast[0].$v[0], 'test " ');
      assert.deepEqual(ast[0].$v[1], { t: 'id', v: 'var' });
      assert.strictEqual(ast[0].$v[2], ' test2');
    });

    it('string with an escaped placeable', function() {
      var ast = parse( '<id "test \\{{ var }} test2">');
      assert.strictEqual(ast[0].$v, 'test {{ var }} test2');
    });

    it('complex string errors', function() {
      var strings = [
        '<id "test {{ var ">',
        '<id "test {{ var \\}} ">',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse( strings[i]);
        });
      }
    });
  });

  describe('Overlays', function() {
    it('string value with HTML markup', function() {
      var ast = parse( '<id "string <strong>foo</strong>">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with an entity', function() {
      var ast = parse( '<id "string &nbsp; foo">');
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });

    it('string value with a smaller sign', function() {
      var ast = parse( '<id "string < foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });

    it('string value with an & sign', function() {
      var ast = parse( '<id "string & foo">');
      assert.strictEqual(ast[0].$v.t, undefined);
    });

    it('complex string value with HTML markup', function() {
      var ast = parse( '<id "string <strong>{{ $n }}</strong>">');
      assert.strictEqual(ast[0].$v.v[0], 'string <strong>');
      assert.deepEqual(ast[0].$v.v[1], {t: 'var', v: 'n'});
      assert.strictEqual(ast[0].$v.t, 'overlay');
    });
  });

  describe('Hash values', function() {
    it('simple hash value', function() {
      var ast = parse( '<id {one: "One", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('simple hash value with a trailing comma', function() {
      var ast = parse( '<id {one: "One", many: "Many", }>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with default', function() {
      var ast = parse( '<id {one: "One", *many: "Many"}>');
      assert.strictEqual(ast[0].$v.one, 'One');
      assert.strictEqual(ast[0].$v.many, 'Many');
      assert.strictEqual(ast[0].$v.__default, 'many');
    });

    it('hash value with redefined default', function() {
      assert.throws(function() {
        parse( '<id {*one: "One", *many: "Many"}>');
      }, /Default item redefinition forbidde/);
    });

    it('nested hash value', function() {
      var ast = parse( '<id {one: {oneone: "foo"}, many: "Many"}>');
      assert.strictEqual(ast[0].$v.one.oneone, 'foo');
      assert.strictEqual(ast[0].$v.many, 'Many');
    });

    it('hash value with an overlay', function() {
      var ast = parse( '<id {one: "<b>test</b>", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one.v, '<b>test</b>');
      assert.strictEqual(ast[0].$v.one.t, 'overlay');
    });

    it('hash value with a complex string', function() {
      var ast = parse( '<id {one: "foo {{ $n }}", many: "Many"}>');
      assert.strictEqual(ast[0].$v.one[0], 'foo ');
      assert.deepEqual(ast[0].$v.one[1], {t: 'var', v: 'n'});
    });

    it('hash errors', function() {
      var strings = [
        '<id {}>',
        '<id {a: 2}>',
        '<id {a: "d">',
        '<id a: "d"}>',
        '<id {{a: "d"}>',
        '<id {a: "d"}}>',
        '<id {a:} "d"}>',
        '<id {2}>',
        '<id {"a": "foo"}>',
        '<id {"a": \'foo\'}>',
        '<id {2: "foo"}>',
        '<id {a:"foo"b:"foo"}>',
        '<id {a }>',
        '<id {a: 2, b , c: 3 } >',
        '<id {*a: "v", *b: "c"}>',
        '<id {}>',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse( strings[i]);
        });
      }
    });
  });

  describe('Attributes', function() {
    it('simple attribute', function() {
      var ast = parse( '<id "foo" title: "Title">');
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('two attributes', function() {
      var ast = parse( '<id "foo" title: "Title" placeholder: "P">');
      assert.strictEqual(ast[0].title, 'Title');
      assert.strictEqual(ast[0].placeholder, 'P');
    });

    it('attribute with no value', function() {
      var ast = parse( '<id title: "Title">');
      assert.strictEqual(ast[0].$v, undefined);
      assert.strictEqual(ast[0].title, 'Title');
    });

    it('attribute with an overlay value', function() {
      var ast = parse( '<id title: "Title &nbsp;">');
      assert.strictEqual(ast[0].title.v, 'Title &nbsp;');
      assert.strictEqual(ast[0].title.t, 'overlay');
    });

    it('attribute with a complex value', function() {
      var ast = parse( '<id title: "Title {{ $n }}">');
      assert.strictEqual(ast[0].title[0], 'Title ');
      assert.deepEqual(ast[0].title[1], {t: 'var', v: 'n'});
    });

    it('attribute with hash value', function() {
      var ast = parse( '<id title: {one: "One"}>');
      assert.strictEqual(ast[0].title.one, 'One');
    });

    it('attribute with hash value with a default', function() {
      var ast = parse( '<id title: {*one: "One"}>');
      assert.strictEqual(ast[0].title.one, 'One');
      assert.strictEqual(ast[0].title.__default, 'one');
    });

    it('attribute with a complex hash value with a default', function() {
      var ast = parse( '<id title: {*one: "One {{ $n }}"}>');
      assert.strictEqual(ast[0].title.one[0], 'One ');
      assert.deepEqual(ast[0].title.one[1], {t: 'var', v: 'n'});
      assert.strictEqual(ast[0].title.__default, 'one');
    });

    it('attribute with a complex hash value with a default and overlay',
      function() {

      var ast = parse( '<id title: {*one: "One&nbsp;{{ $n }}"}>');
      assert.strictEqual(ast[0].title.one.v[0], 'One&nbsp;');
      assert.deepEqual(ast[0].title.one.v[1], {t: 'var', v: 'n'});
      assert.deepEqual(ast[0].title.one.t, 'overlay');
      assert.strictEqual(ast[0].title.__default, 'one');
    });

    it('attribute errors', function() {
      var strings = [
        '<id : "foo">',
        '<id "value" : "foo">',
        '<id 2: "foo">',
        '<id a: >',
        '<id: "">',
        '<id a: b:>',
        '<id a: "foo" "heh">',
        '<id a: 2>',
        '<id "a": "a">',
        '<id a2:"a"a3:"v">',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse( strings[i]);
        });
      }
    });
  });

  describe('Index', function() {
    it('simple index', function() {
      var ast = parse( '<id[n] "foo">');
      assert.deepEqual(ast[0].$x, [{t: 'id', v: 'n'}]);
    });

    it('two level index', function() {
      var ast = parse( '<id[n, v] "foo">');
      assert.deepEqual(ast[0].$x[0], {t: 'id', v: 'n'});
      assert.deepEqual(ast[0].$x[1], {t: 'id', v: 'v'});
    });

    it('index on attribute', function() {
      var ast = parse( '<id title[n]: "foo">');
      assert.deepEqual(ast[0].title.x, [{t: 'id', v: 'n'}]);
    });

    it('two level index on attribute', function() {
      var ast = parse( '<id title[n, v]: "foo">');
      assert.deepEqual(ast[0].title.x[0], {t: 'id', v: 'n'});
      assert.deepEqual(ast[0].title.x[1], {t: 'id', v: 'v'});
    });

    it('index errors', function() {
      var strings = [
        '<id[ "foo">',
        '<id] "foo">',
        '<id[ \'] "foo">',
        '<id{ ] "foo">',
        '<id[ } "foo">',
        '<id[" ] "["a"]>',
        '<id[a]["a"]>',
        '<id["foo""foo"] "fo">',
        '<id[a, b, ] "foo">',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse( strings[i]);
        });
      }
    });
  });

  describe('Expressions', function() {
    it('identifier', function() {
      var ast = parse( '<id[n] "foo {{ n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'id', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'id', v: 'n'});
    });

    it('variable', function() {
      var ast = parse( '<id[$n] "foo {{ $n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'var', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'var', v: 'n'});
    });

    it('global', function() {
      var ast = parse( '<id[@n] "foo {{ @n }}">');
      assert.deepEqual(ast[0].$x, [{t: 'glob', v: 'n'}]);
      assert.deepEqual(ast[0].$v[1], {t: 'glob', v: 'n'});
    });

    it('complex id', function() {
      var ast = parse( '<id[@gaia.formFactor] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'prop');
      assert.deepEqual(ast[0].$x[0].e, {t: 'glob', v: 'gaia'});
      assert.strictEqual(ast[0].$x[0].p, 'formFactor');
      assert.strictEqual(ast[0].$x[0].c, false);
    });

    it('call expression', function() {
      var ast = parse( '<id[@cldr.plural($n)] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'call');
      assert.strictEqual(ast[0].$x[0].v.t, 'prop');
      assert.deepEqual(ast[0].$x[0].v.e, {t: 'glob', v: 'cldr'});
      assert.strictEqual(ast[0].$x[0].v.p, 'plural');
      assert.deepEqual(ast[0].$x[0].a[0], {t: 'var', v: 'n'});
    });

    it('call expression with two params', function() {
      var ast = parse(
        '<id[@icu.formatDate($d, dateShortFormat)] "foo">');
      assert.strictEqual(ast[0].$x[0].t, 'call');
      assert.strictEqual(ast[0].$x[0].v.t, 'prop');
      assert.deepEqual(ast[0].$x[0].v.e, {t: 'glob', v: 'icu'});
      assert.strictEqual(ast[0].$x[0].v.p, 'formatDate');
      assert.deepEqual(ast[0].$x[0].a[0], {t: 'var', v: 'd'});
      assert.deepEqual(ast[0].$x[0].a[1], {t: 'id', v: 'dateShortFormat'});
    });

    it('identifier errors', function() {
      var strings = [
        '<i`d "foo">',
        '<0d "foo">',
        '<09 "foo">',
        '<i!d "foo">',
        '<id[i`d] "foo">',
        '<id[0d] "foo">',
        '<id[i!d] "foo">',
        '<id "test {{ i`d }}">',
        '<id "test {{ 09d }}">',
      ];
      for (var i in strings) {
        assert.throws(function() {
          var ast = parse( strings[i]);
        });
      }
    });
  });
});
