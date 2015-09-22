var fs = require('fs');

require('../../node_modules/babel-core/register');
var L20n = require('../../src/runtime/node');
var PropertiesParser = require('../../src/lib/format/properties/parser');
var L20nParser = require('../../src/lib/format/l20n/entries/parser');

var propCode = fs.readFileSync(__dirname + '/example.properties').toString();
var l20nCode = fs.readFileSync(__dirname + '/example.l20n').toString();

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
  "link2": "LINK2",
  "count": 10,
};

var lang = {
  code:'en-US',
  src: 'app',
  dir: 'ltr'
};

function micro(time) {
  // time is [seconds, nanoseconds]
  return Math.round((time[0] * 1e9 + time[1]) / 1000);
}

var cumulative = {};
var start = process.hrtime();

var entries = PropertiesParser.parse(null, propCode);
cumulative.parseEnd = process.hrtime(start);

cumulative.l20nParseStart = process.hrtime(start);

var entries = L20nParser.parse(null, l20nCode);
cumulative.l20nParseEnd = process.hrtime(start);

var env = new L20n.Env('en-US');
var ctx = env.createContext(['example.l20n']);
env._resCache['example.l20nen-USapp'] = entries;

cumulative.format = process.hrtime(start);

for (var id in entries) {
   L20n.format(ctx, lang, data, entries[id]);
}

cumulative.formatEnd = process.hrtime(start);

cumulative.ctxResolveValues = process.hrtime(start);
var keys = [];

for (var id in entries) {
  keys.push([id, data]);
}
ctx.resolveValues([lang], keys);
cumulative.ctxResolveValuesEnd = process.hrtime(start);

var results = {
  propParse: micro(cumulative.parseEnd),
  l20nParse: micro(cumulative.l20nParseEnd) - micro(cumulative.l20nParseStart),
  format: micro(cumulative.formatEnd) - micro(cumulative.format),
  resolveValues:
    micro(cumulative.ctxResolveValuesEnd) - micro(cumulative.ctxResolveValues)
};
console.log(JSON.stringify(results));
