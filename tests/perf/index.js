var performanceTimer;

function init() {
  var files = [
    '/l20n/js/lib/l20n.js',
    '/l20n/js/lib/events.js',
    '/l20n/js/lib/parser.js',
    '/l20n/js/lib/compiler.js',
  ];
  
  performanceTimer = new PerfTest();
  performanceTimer.files = files;


  performanceTimer.start(function() {
    console.log('init');
    var start = performanceTimer.getTime();
    var ctx = L20n.getContext('main');
    ctx.addResource('a.lol');
    ctx.addResource('b.lol');
    ctx.freeze();
    ctx.addEventListener('ready', function() {
      console.log('ready');
      var end = performanceTimer.getTime();
      performanceTimer.perfData['lib']['ready'].push((end - start));
      performanceTimer.updateStats();
    });
    console.log('end init')
  });
}

/* PerfTest */


function PerfTest() {
  this.perfData = {
    'lib': {
      'load': [],
      'ready': [],
    },
    'contexts': {}
  };

  var self = this;

  this.timers = {};

  this.getTime = function() {
    return window.performance.now();
  }

  this.start = function(callback) {
    measureCodeLoading(callback);
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
    tds.push(test.length.toFixed(2));
    tds.push(min(test).toFixed(2));
    tds.push((sum(test)/test.length).toFixed(2));
    tds.push(max(test).toFixed(2));
    tds.push(sum(test).toFixed(2));

    for(var j=0;j<tds.length;j++) {
      var td = document.createElement('td');
      td.innerHTML = tds[j];
      tr.appendChild(td);
    }
    return tr;
  }

  this.updateStats = function() {
    var body = document.getElementById('body');
    var tests = self.perfData['lib'];
    var cvs = document.createElement('div');

    var h2;
    var headers = [
      'Name',
      'No.',
      'Min. time',
      'Avg. time',
      'Max. time',
      'Cum. time'  
    ];
    var lib = self.perfData['lib'];
    h2 = document.createElement('h2');
    h2.innerHTML = 'Library';
    cvs.appendChild(h2);

    var table = document.createElement('table');
    table.setAttribute('border', '1');
    var tr = document.createElement('tr');
    for (var j in headers) {
      var th = document.createElement('th');
      th.innerHTML = headers[j];
      tr.appendChild(th);
    } 
    table.appendChild(tr);
    for (var j in lib) {
      var test = lib[j];
      if (test.length == 0) {
        continue;
      }
      var tr = drawTestRow(j, test);
      table.appendChild(tr);
    }
    cvs.appendChild(table);
    for (i in self.perfData['contexts']) {
      var ctx = self.perfData['contexts'][i];
      h2 = document.createElement('h2');
      h2.innerHTML = 'Context "' + i + '"';
      cvs.appendChild(h2);

      var table = document.createElement('table');
      table.setAttribute('border', '1');
      var tr = document.createElement('tr');
      for (var j in headers) {
        var th = document.createElement('th');
        th.innerHTML = headers[j];
        tr.appendChild(th);
      } 
      table.appendChild(tr);
      for (var j in ctx) {
        var test = ctx[j];
        if (test.length == 0) {
          continue;
        }
        var tr = drawTestRow(j, test);
        table.appendChild(tr);
      }
      cvs.appendChild(table);
    }
    document.body.appendChild(cvs);
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
        end = performanceTimer.getTime();
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

    start = performanceTimer.getTime();
    onLoad();
  }

}


