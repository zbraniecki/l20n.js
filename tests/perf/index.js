var performanceTimer;

window.addEventListener('load', function() {
  var files = [
    '/l20n/js/lib/l20n.js',
    '/l20n/js/lib/events.js',
    '/l20n/js/lib/parser.js',
    '/l20n/js/lib/compiler.js',
  ];
  
  performanceTimer = new PerfTest();
  performanceTimer.files = files;
});


function init() {
  console.log('init')
  var ctx = L20n.getContext('main');
  ctx.addResource('a.lol');
  ctx.addResource('https://raw.github.com/l20n/l20n.js/master/tests/html/client/attrs/index.lol');
  ctx.freeze();
  ctx.addEventListener('ready', function() {
    performanceTimer.updateStats();
  });
  console.log('end init')
}

/* PerfTest */


function PerfTest() {
  this.perfData = {
    'lib': {
      'load': [],
    },
    'contexts': {}
  };

  var self = this;

  this.start = function() {
    measureCodeLoading(init);
  }

  function max(array){
    return Math.max.apply(Math, array);
  }

  function min(array){
    return Math.min.apply(Math, array);
  }

  function sum(array) {
    return array.reduce(function(a,b){return a+b;});
  }

  function drawTestRow(name, test) {
    var tr = document.createElement('tr');
    var tds = [];
    tds.push(name);
    tds.push(test.length);
    tds.push(min(test));
    tds.push(sum(test)/test.length);
    tds.push(max(test));
    tds.push(sum(test));

    for(var j=0;j<tds.length;j++) {
      var td = document.createElement('td');
      td.innerHTML = tds[j];
      tr.appendChild(td);
    }
    return tr;
  }

  this.updateStats = function() {
    console.log(self.perfData);
    var libTable = document.getElementById('libtable');
    var body = document.getElementById('body');
    var tests = self.perfData['lib'];

    for (var i in tests) {
      var test = tests[i];
      var tr = drawTestRow(i, test);
      libTable.appendChild(tr);
    }

    var h2;
    var headers = [
      'Name',
      'No.',
      'Min. time',
      'Avg. time',
      'Max. time',
      'Cum. time'  
    ];
    for (i in self.perfData['contexts']) {
      var ctx = self.perfData['contexts'][i];
      h2 = document.createElement('h2');
      h2.innerHTML = 'Context "' + i + '"';
      body.appendChild(h2);

      var table = document.createElement('table');
      table.setAttribute('border', '1');
      var tr = document.createElement('tr');
      for (var j in headers) {
        var th = document.createElement('th');
        th.innerHTML = headers[j];
        tr.appendChild(th);
      } 
      table.appendChild(tr);
      console.log(ctx);
      for (var j in ctx) {
        if (j == 'timers') {
          continue;
        }
        var test = ctx[j];
        if (test.length == 0) {
          continue;
        }
        console.log(test);
        var tr = drawTestRow(j, test);
        table.appendChild(tr);
      }
      body.appendChild(table);
    }
  }

  /*
   * The reason why load scripts synchronously is because
   * otherwise they load in random order and that screws the library
   */
  function measureCodeLoading(callback) {
    var start = 0;
    var end = 0;

    var onLoad = function(e) { 
      if (!performanceTimer.files.length) {
        end = new Date();
        self.perfData['lib']['load'].push(end-start);
        callback();
      } else {
      var script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', performanceTimer.files.shift());
      script.addEventListener('load', onLoad);
      document.body.appendChild(script); 
      }
    }

    start = new Date();
    onLoad();
  }

}


