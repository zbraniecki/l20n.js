var fs = require('fs');

var L20n = require('../../src/bindings/node');
var Context = require('../../src/lib/context').Context;

var parser = L20n.L20nParser;
var env = {
  __plural: L20n.getPluralRule('en-US')
};

var code = fs.readFileSync(__dirname + '/example.l20n').toString();
var data = {
  "brandShortName": "BRANDSHORTNAME",
  "ssid": "SSID",
  "capabilities": "CAPABILITIES",
  "linkSpeed": "LINKSPEED",
  "pin": "PIN",
  "n": 3,
  "name": "NAME",
  "device": "DEVICE",
  "code": "CODE",
  "app": "APP",
  "size": 100,
  "unit": "UNIT",
  "list": "LIST",
  "level": "LEVEL",
  "number": "NUMBER",
  "link1": "LINK1",
  "link2": "LINK2"
}

function micro(time) {
  // time is [seconds, nanoseconds]
  return Math.round((time[0] * 1e9 + time[1]) / 1000);
}

var cumulative = {};
var start = process.hrtime();

var ast = parser.parse(code);
cumulative.parseEnd = process.hrtime(start);


var results = {
  parse: micro(cumulative.parseEnd),
};
console.log(JSON.stringify(results));
