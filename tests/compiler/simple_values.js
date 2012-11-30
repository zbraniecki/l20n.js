var fs = require('fs');
var Compiler = process.env.L20N_COV
  ? require('../../_build/cov/lib/compiler.js').Compiler
  : require('../../lib/compiler.js').Compiler;
var Parser = require('../../lib/parser.js').Parser;

var compiler = new Compiler(null, Parser);
var parser = new Parser();

function read(filename) {
  var lol = fs.readFileSync('./tests/fixtures/' + filename).toString();
  return parser.parse(lol);
}

describe('Basic entities', function(){
  var filename = 'simple_values.lol';
  var ast, env;

  before(function() {
    ast = read(filename);
  });

  beforeEach(function() {
    env = compiler.compile(ast);
  });

  describe('Simple value', function(){
    describe('Simple string value', function(){
      it('is "Firefox"', function(){
        var value = env['brandName'].toString();
        value.should.equal("Firefox");
      });
    });
  });
  describe('Simple array', function(){
    describe('an array without an index', function(){
      it('is "Firefox" when called without an index', function(){
        var value = env['brandName11'].toString();
        value.should.equal('Firefox');
      });
      it('is "Firefox" when called with [0]', function(){
        var value = env['brandName11']._resolve({}, [0]);
        value.should.equal('Firefox');
      });
      it('is "Aurora" when called with [1]', function(){
        var value = env['brandName11']._resolve({}, [1]);
        value.should.equal('Aurora');
      });
      it('is "Firefox" when called with [7]', function(){
        // XXX different in the DEBUG mode
        var value = env['brandName11']._resolve({}, [7]);
        value.should.equal('Firefox');
      });
      it('is "Aurora" when called with [1, 7]', function(){
        // XXX different in the DEBUG mode
        var value = env['brandName11']._resolve({}, [1, 7]);
        value.should.equal('Aurora');
      });
    });
    describe('an array with an index of [1]', function(){
      it('is "Aurora" when called without an index', function(){
        var value = env['brandName12'].toString();
        value.should.equal('Aurora');
      });
      it('is "Firefox" when called with [0]', function(){
        var value = env['brandName12']._resolve({}, [0]);
        value.should.equal('Firefox');
      });
      it('is "Firefox" when called with [7]', function(){
        // XXX different in the DEBUG mode
        var value = env['brandName12']._resolve({}, [7]);
        value.should.equal('Firefox');
      });
      it('is "Firefox" when called with [7, 7]', function(){
        // XXX different in the DEBUG mode
        var value = env['brandName12']._resolve({}, [7, 7]);
        value.should.equal('Firefox');
      });
    });
  });
  describe('Simple hash', function(){
    describe('a hash with no index and no default value', function(){
      it('is "Firefox"', function(){
        var value = env['brandName21'].toString();
        value.should.equal('Firefox');
      });
      it('is "Aurora when called with an index of ["feminine"] "', function(){
        var value = env['brandName21']._resolve({}, ['feminine']);
        value.should.equal('Aurora');
      });
    });
    describe('a hash with no index and with a default value', function(){
      it('is "Aurora"', function(){
        var value = env['brandName22'].toString();
        value.should.equal('Aurora');
      });
      it('is "Firefox" when called with an index of ["masculine"] ', function(){
        var value = env['brandName22']._resolve({}, ['masculine']);
        value.should.equal('Firefox');
      });
    });
    describe('a hash with an index and no default value', function(){
      it('is "Aurora"', function(){
        var value = env['brandName23'].toString();
        value.should.equal('Aurora');
      });
      it('is "Firefox" when called with an index of ["masculine"] ', function(){
        var value = env['brandName23']._resolve({}, ['masculine']);
        value.should.equal('Firefox');
      });
    });
    describe('a hash with too many index keys and no default value', function(){
      it('is "Aurora"', function(){
        // XXX different in the DEBUG mode
        var value = env['brandName23'].toString();
        value.should.equal('Aurora');
      });
    });
  });
});
