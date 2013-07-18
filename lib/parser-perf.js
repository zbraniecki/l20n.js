var require = function() {
  return function() {
  };
}

var module = null;

var define = function(cb) {
  var exp = {};
  cb(require, exp, module);
  run(exp.Parser);
}

load('./l20n/parser.js');


function run(Parser) {
  var parser = new Parser(true);

  var source = read('settings.en-US.lol');

  var t = 10000;
  var lol;

  for (var i=0; i < t; i++) {
    lol = parser.parse(source);
  }
}

