    function downloadAsync(url, callback) {
      xhr = new XMLHttpRequest();
      xhr.overrideMimeType('text/plain');
      xhr.addEventListener('load', function() {
        if (xhr.status == 200) {
          if (window.performanceTimer) {
            performanceTimer.resolveTimer(url, 'resloading');
          }
          callback(xhr.responseText);
        } else {
          isCorrupted = true;
          exception = new Exception(L20n.HTTP_ERROR,
                                    'XHR returned an error code for url: ' + url,
                                    xhr.status);
          _fire(fallbacks, [exception]);
        }
      });
        xhr.addEventListener('readystatechange', function(e) {
          if (xhr.readyState == 1) {
            window.performanceTimer.registerTimer(url, 'resloading');
          }
        });
      xhr.addEventListener('abort', function() {
        debug('XHR aborted for ', url);
      });
      xhr.addEventListener('error', function() {
        debug('XHR error for ', url);
        exception = new Exception(L20n.XHR_ERROR,
                                  'XHR returned an error for url: ' + url);
        _fire(fallbacks, [exception]);
      });
      xhr.open('GET', url, true);
      xhr.send('');
    }


function WrappedContext() {
  var worker = new Worker('./shared/js/worker.js'); 
  var asyncGets = {};
  var onReady;
  
  function randomUUID() {
    var s = [], itoh = '0123456789ABCDEF';

    // Make array of random hex digits. The UUID only has 32 digits in it, but we
    // allocate an extra items to make room for the '-'s we'll be inserting.
    for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);

    // Conform to RFC-4122, section 4.4
    s[14] = 4;  // Set 4 high bits of time_high field to version
    s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

    // Convert to hex chars
    for (var i = 0; i <36; i++) s[i] = itoh[s[i]];

    // Insert '-'s
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
  }
  function postMsg(cmd, arg1, arg2) {
    worker.postMessage([cmd, arg1, arg2]);
  }
  worker.onerror = function(e) {
    console.log(e);
  }
  worker.onmessage = function(e) {
    var type = e.data[0];
    if (type == 'get') {
      var id = e.data[1];
      var val = e.data[2];
      asyncGets[e.data[1]].cb(val);
    }
    if (type == 'getMany') {
      var id = e.data[1];
      var vals = e.data[2];
      asyncGets[e.data[1]].cb(vals);
    }
    if (type == 'event') {
      if (e.data[1] == 'ready') {
        onReady(); 
      }
    }
  }

  return {
    addResource: function(url) {
      console.log('addResource');
      downloadAsync(url, this.addResourceSource);
    },
    addResourceSource: function(str) {
      postMsg('addResourceSource', str);
    },
    freeze: function() {
      //postMsg('freeze');
    },
    get: function(id, callback) {
      var reqID = randomUUID();
      asyncGets[reqID] = {'cb': callback};
      postMsg('get', reqID, id);
    },
    getMany: function(ids, callback) {
      var reqID = randomUUID();
      asyncGets[reqID] = {'cb': callback};
      postMsg('getMany', reqID, ids);
    },
    addEventListener: function(type, cb) {
      if (type == 'ready') {
      onReady = cb;
      }
    },
    getAttributes: function(id, args) {
      return {};
    },
  }
}
