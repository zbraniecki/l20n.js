load('../../dist/jsshell/l10n.js');

var parser = L20n.L20nParser;
var env = {
  __plural: L20n.getPluralRule('en-US')
};

var code = read('./example.l20n');
var data = {
  "ssid": "SSID",
  "capabilities": "CAPABILITIES",
  "linkSpeed": "LINKSPEED",
  "pin": "PIN",
  "n": 3,
  "name": "NAME",
  "device": "DEVICE",
  "code": "CODE",
  "app": "APP",
  "size": "SIZE",
  "unit": "UNIT",
  "list": "LIST",
  "level": "LEVEL",
  "number": "NUMBER",
  "link1": "LINK1",
  "link2": "LINK2"
}

function micro(time) {
  // time is in milliseconds
  return Math.round(time * 1000);
}

var times = {};
times.start = Date.now();

var ast = parser.parse(code);
times.parseEnd = Date.now();

var results = {
  parse: micro(times.parseEnd - times.start),
};

print(JSON.stringify(results));
