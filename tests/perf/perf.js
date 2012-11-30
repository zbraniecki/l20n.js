(function() {
  'use strict';

  this.PerfTest = PerfTest;
  this.init = init;

function PerfTest() {
  this.files = [];
  this.perfData = {
    'doc': {
      'performance.*': {},
      'load': [],
      'l10n bootstrap': [],
      'pages': {},
      'localized': [],
    },
    'contexts': {}
  };

  var self = this;

  // this is an object for
  // storing asynchronous timers
  this.timers = {};

  this.registerTimer = function(id, test, callback) {
    if (!id) {
      id = 'doc';
    }
    if (!this.timers[id]) {
      this.timers[id] = {};
    }
    if (!this.timers[id][test]) {
      this.timers[id][test] = {};
    }
    this.timers[id][test]['start'] = this.getTime();
  }

  this.addPerformanceAPINumbers = function() {
    for (var i in performance.timing) {
      if (performance.timing[i] === 0) {
        this.perfData['doc']['performance.*'][i] = [0, 0];
      } else {
        this.perfData['doc']['performance.*'][i] = [performance.timing.navigationStart, performance.timing[i]];
      }
    }
  }

  this.setTimerCallback = function(id, test, callback) {
    if (!this.timers[id]) {
      this.timers[id] = {};
    }
    if (!this.timers[id][test]) {
      this.timers[id][test] = {};
    }
    this.timers[id][test]['done'] = callback;
  }

  this.resolveTimer = function(id, test, start, end) {
    if (!id) {
      id = 'doc';
    }
    if (!start) {
      start = this.timers[id][test]['start'];
    }
    if (!end) {
      end = this.getTime();
    }
    if (this.timers[id][test]['done']) {
      this.timers[id][test]['done'](start, end);
    }
    return [start, end];
  }

  this.addDataPoint = function(ctxid, tname, elem, start, end) {
    if (!end) {
      end = this.getTime();
    }
    if (ctxid) {
      this.ensureContext(ctxid);
      var test = this.perfData['contexts'][ctxid][tname];
    } else {
      var test = this.perfData['doc'][tname];
    }
    if (elem) {
      test[elem] = [start, end];
    } else {
      test.push([start, end]);
    }
  }

  this.getTime = function() {
    return window.performance.now();
  }

  this.start = function(callback) {
    if (window.performanceTimer.files.length) {
      measureCodeLoading(callback);
    } else {
      callback();
    }
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

  this.addHook = function() {
    var body = document.body;
    var button = document.createElement('button');
    button.addEventListener('click', self.showStats);
    button.innerHTML = "click me";
    button.style.position = "fixed";
    button.style.bottom = 0;
    button.style.right = 0;
    body.appendChild(button);
  }

  function drawTestRow(table, name, test, subrow) {
    var tr = document.createElement('tr');
    var tds = [];
    var i;
    var values = [];

    for (i in test) {
      values.push(test[i][1] - test[i][0]);
    }
    if (values.length == 0) {
      return;
    }
    if (subrow) {
      name = '&nbsp;&nbsp;&nbsp;&nbsp;'+name;
    }
    tds.push(name);
    tds.push(values.length.toFixed(2));
    if (values.length > 1 && name !== 'performance.*') {
      tds.push(min(values).toFixed(2));
      tds.push((sum(values)/values.length).toFixed(2));
      tds.push(max(values).toFixed(2));
    } else {
      tds.push('&nbsp;');
      tds.push('&nbsp;');
      tds.push('&nbsp;');
    }
    if (name == 'performance.*') {
      tds.push(max(values).toFixed(2));
    } else {
      tds.push(sum(values).toFixed(2));
    }

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
    /* Document */
    var doc = self.perfData['doc'];
    h2 = document.createElement('h2');
    h2.innerHTML = 'Document';
    cvs.appendChild(h2);

    var button = document.createElement('button');
    button.innerHTML = 'Show graph';
    button.addEventListener('click', function(e) {
      showGraph();
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    cvs.appendChild(button);

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
    for (var j in doc) {
      var test = doc[j];
      if (test.length == 0) {
        continue;
      }
      drawTestRow(table, j, test);
    }
    cvs.appendChild(table);

    /* Contexts */
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
        self.addDataPoint(null, 'load', null, start);
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

function showGraph(){
  if(!window.__profiler || window.__profiler.scriptLoaded!==true){var d=document,h=d.getElementsByTagName("head")[0],s=d.createElement("script"),l=d.createElement("div"),c=function(){if(l){d.body.removeChild(l)}},t=new Date();s.type="text/javascript";l.style.cssText="z-index:999;position:fixed;top:10px;left:10px;display:inline;width:auto;font-size:14px;line-height:1.5em;font-family:Helvetica,Calibri,Arial,sans-serif;text-shadow:none;padding:3px 10px 0;background:#FFFDF2;box-shadow:0 0 0 3px rgba(0,0,0,.25),0 0 5px 5px rgba(0,0,0,.25); border-radius:1px";l.innerHTML="Just a moment";s.src="./js/graph.js?"+t.getTime();s.onload=c;s.onreadystatechange=function(){if(this.readyState=="loaded"){c()}};d.body.appendChild(l);h.appendChild(s);} else if(typeof window.__profiler === "function") {window.__profiler();}};

var performanceTimer;
window.performanceTimer = performanceTimer;

function init() {
  window.performanceTimer = new PerfTest();
  window.performanceTimer.addPerformanceAPINumbers();
  window.performanceTimer.addHook();
  init2();
}

function init2() {
  window.performanceTimer.start(function() {
    var start = window.performanceTimer.getTime();
    var ctx = L20n.getContext('main');
    ctx.addResource('locales/settings.en-US.lol');
    ctx.freeze();
    ctx.addEventListener('ready', function() {
      var end = window.performanceTimer.getTime();
      window.performanceTimer.addDataPoint(null, 'l10n bootstrap', null, start, end);

      var b = ctx.get('newpinTitle');
    });
  });
}

}).call(this);
