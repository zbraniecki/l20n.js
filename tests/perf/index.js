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

      var a = ctx.get('a');
      var b = ctx.get('b');
      var c = ctx.get('c');
      performanceTimer.showStats();
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
      'pages': {},
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

  function drawTestRow(table, name, test, subrow) {
    var tr = document.createElement('tr');
    var tds = [];
    var i;

    if (Array.isArray(test)) {
      var values = test;
    } else {
      var values = [];
      for (i in test) {
        values.push(test[i]);
      }
    }
    if (values.length == 0) {
      return;
    }
    tds.push(name);
    tds.push(values.length.toFixed(2));
    if (values.length > 1) {
      tds.push(min(values).toFixed(2));
      tds.push((sum(values)/values.length).toFixed(2));
      tds.push(max(values).toFixed(2));
    } else {
      tds.push('&nbsp;');
      tds.push('&nbsp;');
      tds.push('&nbsp;');
    }
    tds.push(sum(values).toFixed(2));

    for (var j=0;j<tds.length;j++) {
      var td = document.createElement('td');
      td.innerHTML = tds[j];
      tr.appendChild(td);
    }
    if (!subrow && !Array.isArray(test)) {
      tr.setAttribute('expanded', 'false');
      tr.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tr.getAttribute('expanded') == 'false') {
          var ns = tr.nextElementSibling;
          for (var j=0;j<values.length;j++) {
            ns.style.display = 'table-row';
            ns = ns.nextElementSibling;
          }
          tr.setAttribute('expanded', 'true');
        } else {
          var ns = tr.nextElementSibling;
          for (var j=0;j<values.length;j++) {
            ns.style.display = 'none';
            ns = ns.nextElementSibling;
          }
          tr.setAttribute('expanded', 'false');
        }
      });
    }
    if (subrow) {
      tr.style.display = 'none';
    }
    table.appendChild(tr);

    if (!Array.isArray(test)) {
      for (i in test) {
        drawTestRow(table, i, [test[i]], true);
      }
    }
  }

  this.showStats = function() {
    var body = document.getElementById('body');
    var tests = self.perfData['lib'];
    var cvs = document.createElement('div');
    cvs.setAttribute('style', 'z-index:100;position:absolute;top:0;left:0;background-color:#eee;border: 1px solid #333');
    cvs.addEventListener('click', function() {
      document.body.removeChild(cvs);
    });
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
    table.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
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
      drawTestRow(table, j, test);
    }
    cvs.appendChild(table);
    for (var i in self.perfData['contexts']) {
      var ctx = self.perfData['contexts'][i];
      h2 = document.createElement('h2');
      h2.innerHTML = 'Context "' + i + '"';
      cvs.appendChild(h2);

      var table = document.createElement('table');
      table.setAttribute('border', '1');
      table.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
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
        drawTestRow(table, j, test);
      }
      cvs.appendChild(table);
    }
    document.body.appendChild(cvs);
  }

  this.ensureContext = function(id) {
    if(!this.perfData.contexts[id]) {
      this.perfData.contexts[id] = {
        'bootstrap': [],
        'resloading': {},
        'parsing': {},
        'compilation': [],
        'execution': {}
      }; 
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


