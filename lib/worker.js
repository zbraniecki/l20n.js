importScripts('./l20n-min.js');

var window = this;
var ctx = L20n.getContext('main');

ctx.addEventListener('ready', function() {
  postMessage(['event', 'ready']);
});

function addResourceSource(str) {
  ctx.addResourceSource(str);
}

function freeze() {
  ctx.freeze();
}

function get(id) {
  try {
  return ctx.get(id);
  } catch (e) {
    return 'no id';
  }
}

addEventListener('message', function(e) {
  var cmd = e.data[0];
  var msg = e.data[1];
  switch (cmd) {
    case 'init':
      startL20n();
      break;
    case 'addResourceSource':
      addResourceSource(msg);
      freeze();
      break;
    case 'freeze':
      freeze();
      break;
    case 'get':
      var val = get(e.data[2]);
      var reqID = e.data[1];
      postMessage(['get', reqID, val]);
      break;
    case 'getMany':
      var vals = {};
      var reqID = e.data[1];
      for (var i=0;i<e.data[2].length;i++) {
        var id = e.data[2][i];
        vals[id] = get(id);
      }
      postMessage(['getMany', reqID, vals]);
      break;
  }
});

