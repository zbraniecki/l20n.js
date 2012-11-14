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
      performanceTimer.addDataPoint(null, 'ready', null, start, end);

      var a = ctx.get('a');
      var b = ctx.get('b');
      var c = ctx.get('c');
      performanceTimer.showStats();
    });
    console.log('end init')
  });
}
