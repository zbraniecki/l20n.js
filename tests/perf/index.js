var performanceTimer;

function init() {
  var files = [
    './js/lib/l20n.js',
    './js/lib/events.js',
    './js/lib/parser.js',
    './js/lib/compiler.js',
  ];
  performanceTimer = new PerfTest();
  performanceTimer.addPerformanceAPINumbers();
  performanceTimer.files = files;
  performanceTimer.addHook();
  init2();
}

function init2() {
  performanceTimer.start(function() {
    console.log('init');
    var start = performanceTimer.getTime();
    var ctx = L20n.getContext('main');
    ctx.addResource('locales/a.lol');
    ctx.addResource('locales/settings.en-US.lol');
    ctx.freeze();
    ctx.addEventListener('ready', function() {
      console.log('ready');
      var end = performanceTimer.getTime();
      performanceTimer.addDataPoint(null, 'ready', null, start, end);

      var a = ctx.get('a');
      var b = ctx.get('newpinTitle');
    });
    console.log('end init')
  });
}
