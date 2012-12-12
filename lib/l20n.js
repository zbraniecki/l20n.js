(function() {
  'use strict';

  var DEBUG = false;

  var L20n;

  if (typeof exports !== 'undefined') {
    L20n = exports;
    L20n.EventEmitter = require('./events.js').EventEmitter;
    L20n.Parser = require('./parser.js').Parser;
    L20n.Compiler = require('./compiler.js').Compiler;
  } else {
    L20n = this.L20n = {};
  }

  L20n.getContext = function L20n_getContext(id) {
    if (window.performanceTimer) {
      var start = window.performanceTimer.getTime();
    }
    var ctx = new Context();
    if (window.performanceTimer) {
      window.performanceTimer.addDataPoint(id, 'bootstrap', null, start);
    }
    ctx.id = id;
    return ctx;
  };

  // clear the Resource cache which stores unprocessed LOL files and which is 
  // shared across all contexts;  additionally, each context also has its own 
  // cache for ProcessedResources, which needs to be invalidated independently.
  L20n.invalidateCache = function L20n_invalidateCache() {
    return resCache.invalidate();
  };
  
  // define variables and functions whose implementation is 
  // environment-dependent.  Test suites can change the implementation to 
  // support server-side XHR, or to add logic to how URLs are resolved.  See 
  // /tests/lib/context.js for an example.
  var env = {
    DEBUG: DEBUG,
    getURL: function getURL(url) {
      // in DEBUG mode, bypass the server cache
      return this.DEBUG ? url + "?" + Date.now() : url;
    },
    // for now, we only use node to run tests, so it's safe to assume the test 
    // suite will provide its own env anyways.  in the future, however, when we 
    // decide to support node, we should use fs.readFile and fs.readFileSync
    XMLHttpRequest: typeof exports === 'undefined' ? XMLHttpRequest : null,
  }

  Object.defineProperty(L20n, "env", {
    get : function() { return env; },
    set : function(obj) { env = obj; },
    enumerable : false,
    configurable : false,
  });

  function debug() {
    if (env.DEBUG) {
      console.log.apply(this, arguments);
    }
  }

  var globals = {
    get hour() {
      return new Date().getHours();
    },
    get os() {
      if (/^MacIntel/.test(navigator.platform)) {
        return 'mac';
      }
      if (/^Linux/.test(navigator.platform)) {
        return 'linux';
      }
      if (/^Win/.test(navigatgor.platform)) {
        return 'win';
      }
      return 'unknown';
    },
  };

  // Resource errors
  L20n.HTTP_ERROR = 2;
  L20n.XHR_ERROR = 4;
  L20n.PARSE_ERROR = 8;

  // Preprocessing errors
  L20n.NESTED_ERROR = 16;
  L20n.IMPORT_ERROR = 32;

  // Context errors
  L20n.INTEGRITY_ERROR = 64;
  L20n.COMPILE_ERROR = 128;
  L20n.NOVALIDLOCALE_ERROR = 256;

  function Exception(code, msg, data) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  function Cache(ctx, ctor) {
    this.ctx = ctx;
    this.ctor = ctor;
    this.items = {};
  }
  
  Cache.prototype.get = function Cache_get(id) {
    if (!this.items[id]) {
      this.items[id] = new this.ctor(id, this.ctx, this);
    }
    return this.items[id];
  };

  Cache.prototype.invalidate = function Cache_invalidate() {
    this.items = {};
    return true;
  }

  // keep one cache of Resources for all created contexts
  var resCache = new Cache(null, Resource);


  function _ifComplete(self, fn) {
    return function ifComplete() {
      if (self.isComplete()) {
        fn.apply(self, arguments);
      }
    }
  }

  function _fire(callbacks, args) {
    callbacks.forEach(function(callback) {
      callback.apply(this, args);
    });
    callbacks.length = 0;
  }

  function Resource(id) {
    var ast = null;
    var imports = null;
    var callbacks = [];
    var fallbacks = [];
    var xhr;

    // when the resource is downloading, calling its get method will only add 
    // the specified callback to callbacks, without initiating a new XHR
    var isDownloading = false;
    // resource is corrupted when the XHR returned an error;  the resource 
    // must not be used.
    var isCorrupted = false;
    var exception = null;
    // did the parser found any errors in this file?
    var hasErrors = false;

    function downloadAsync(url, callback) {
      debug('Async GET ', url);
      xhr = new env.XMLHttpRequest();
      xhr.overrideMimeType('text/plain');
      xhr.addEventListener('load', function() {
        if (xhr.status == 200) {
          debug(url, 'fetched');
          if (window.performanceTimer) {
            performanceTimer.resolveTimer(id, 'resloading');
          }
          callback(xhr.responseText);
        } else {
          debug(url, 'failed to fetch');
          isCorrupted = true;
          exception = new Exception(L20n.HTTP_ERROR,
                                    'XHR returned an error code for url: ' + url,
                                    xhr.status);
          _fire(fallbacks, [exception]);
        }
      });
        xhr.addEventListener('readystatechange', function(e) {
          if (xhr.readyState == 1) {
            window.performanceTimer.registerTimer(id, 'resloading');
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
      xhr.open('GET', env.getURL(url, true), true);
      xhr.send('');
    }

    function downloadSync(url, callback) {
      debug('Sync GET ', url);
      xhr = new env.XMLHttpRequest();
      xhr.overrideMimeType('text/plain');
      xhr.open('GET', env.getURL(url, false), false);
      if (window.performanceTimer) {
        performanceTimer.registerTimer(url, 'resloading');
      }
      xhr.send('');
      if (xhr.status == 200) {
        debug(url, 'fetched');
        if (window.performanceTimer) {
          console.log(performanceTimer);
          performanceTimer.resolveTimer(url, 'resloading');
        }
        callback(xhr.responseText);
      } else {
        debug(url, 'failed to fetch');
        isCorrupted = true;
        exception = new Exception(L20n.HTTP_ERROR,
                                  'XHR returned an error code for url: ' + url,
                                  xhr.status);
        _fire(fallbacks, [exception]);
      }
    }

    function parse(data) {
      isDownloading = false;
      if (!L20n.parser) {
        L20n.parser = new L20n.Parser(L20n.EventEmitter);
      }
      L20n.parser.addEventListener('error', function(e) {
        debug('Parser error in ' + id);
        debug('Error msg is ' + e.msg);
        debug('Error around "' + e.context + '"');
        if (env.DEBUG) {
          exception = new Exception(L20n.PARSE_ERROR, 'Non-fatal parser error in ' + id, e);
          _fire(fallbacks, [exception, true]);
        }
        hasErrors = true;
      });
      if (window.performanceTimer) {
        var start = performanceTimer.getTime();
      }
      try {
        ast = L20n.parser.parse(data);
      } catch (e) {
        debug('Uncaught error in ' + id);
        exception = new Exception(L20n.PARSE_ERROR, 'Parser error in ' + id, e);
        _fire(fallbacks, [exception]);
        return false;
      }
      if (window.performanceTimer) {
        performanceTimer.resolveTimer(id, 'parsing', start);
      }
      imports = ast.body.filter(function(elem) {
        return elem.type == 'ImportStatement';
      });
      _fire(callbacks, [ast, imports]);
      return true;
    }

    this.abortXHR = function() {
      debug('aborting XHR for ', id);
      xhr.abort();
    };

    this.get = function r_get(callback, fallback, async) {
      if (ast && !hasErrors) {
        callback(ast, imports);
      } else if (isCorrupted) {
        fallback(exception);
      } else {
        callbacks.push(callback);
        fallbacks.push(fallback);
        if (!isDownloading) {
          isDownloading = true;
          if (async) {
            downloadAsync(id, parse);
          } else {
            downloadSync(id, parse);
          }
        }
      }
    }
  }

  function ProcessedResource(id, ctx, cache) {

    var rawast;
    var totalImports = 0;
    var callbacks = [];

    this.id = id;
    this.ctx = ctx;
    this.ast = {
      type: 'LOL',
      body: [],
    };
    this.importedResources = []; // imported resources in order

    // a preprocessed resource is ready when all its child resources are ready 
    // and it has been preprocessed to include their ASTs.
    this.isReady = false;
    // a preprocessed resource is corrupted when its resource is corrupted, or 
    // any of its child preprocessed resources is corrupted too;  a corrupted 
    // preprocessed resource must not be used.
    this.isCorrupted = false;
    // on integrity error, all relevant XHRs (this resource's and its 
    // descendants) are aborted;  this flag makes sure we don't loop 
    // indefinitely in case of recursive imports
    this.isAborted = false;

    // stores the exception for debugging
    var exception = null;

    this.dirname = id ? id.split('/').slice(0, -1).join('/') : null;
    this.resource = id ? resCache.get(id) : null;

    var self = this;

    function relativeToSelf(url) {
      if (url[0] == '/') {
        return url;
      } else if (self.dirname) {
        // strip the trailing slash if present
        if (self.dirname[self.dirname.length - 1] == '/') {
          self.dirname = self.dirname.slice(0, self.dirname.length - 1);
        }
        return self.dirname + '/' + url;
      } else {
        return './' + url;
      }
    }

    function normalizeURL(url) {
      var normalized = [];
      var parts = url.split('/');
      parts.forEach(function(part, i) {
        if (part == '.') {
          // don't do anything
        } else if (part == '..' && normalized[normalized.length - 1]) {
          // remove the last element of `normalized`
          normalized.splice(normalized.length - 1, 1);
        } else {
          normalized.push(part);
        }
      });
      return normalized.join('/');
    };

    function _expandUrn(urn, vars) {
      return urn.replace(/(\{\{\s*(\w+)\s*\}\})/g,
        function(match, p1, p2, offset, string) {
          if (vars.hasOwnProperty(p2)) {
            return vars[p2];
          }
          return p1;
      });
    }

    function resolveURI(uri) {
      if (!/^l10n:/.test(uri)) {
        var url = normalizeURL(relativeToSelf(uri));
        return [url];
      }
      if (self.ctx.settings.locales === null) {
        throw "Can't use schema uris without settings.locales";
      }
      var match = uri.match(/^l10n:(?:([^:]+):)?([^:]+)/);
      if (match === null) {
        throw "Malformed resource scheme: " + uri;
      }
      var vars = {
        'locale': self.ctx.getLocale(),
        'app': '',
        'resource': match[2]
      };
      if (self.ctx.settings.schemes === null) {
        if (match[1] !== undefined) {
          throw "Can't use schema uris without settings.schemes";
        }
        uri = [normalizeURL(_expandUrn(match[2], vars))];
      } else {
        if (match[1]) {
          vars['app'] = match[1];
        }
        uri = [];
        for (var i in self.ctx.settings.schemes) {
          var expanded = _expandUrn(self.ctx.settings.schemes[i], vars);
          uri.push(normalizeURL(expanded));
        }
      }
      return uri;
    }

    function preprocess() {
      if (this.isReady) {
        return;
      }
      rawast.body.forEach(function(node) {
        if (node.type == 'ImportStatement') {
          var importedAST = this.importedResources.shift().ast;
          this.ast.body = this.ast.body.concat(importedAST.body);
        } else {
          this.ast.body.push(node);
        }
      }, this);
      this.isReady = true;
      _fire(callbacks);
      return;
    }

    this.abortXHRs = function() {
      if (this.isAborted) {
        return true;
      }
      this.isAborted = true;
      if (this.resource) {
        this.resource.abortXHR();
      }
      this.importedResources.forEach(function(imported) {
        imported.abortXHRs();
      });
      return true;
    };

    this.load = function pr_load(callback, fallback, nesting, async) {
      if (this.isReady) {
        callback();
      } else if (this.isCorrupted) {
        fallback(exception);
      } else {
        callbacks.push(callback);
        this.resource.get(function resolveImports(ast, imports) {
          rawast = ast;
          totalImports = imports.length;
          if (totalImports) {
            imports.forEach(function(node){
              debug('importing', node.uri.content)
              self.importResource(node.uri.content, 
                                  _ifComplete(self, preprocess), 
                                  fallback, nesting + 1, async);
            });
          } else {
            self.ast = rawast;
            self.isReady = true;
            _fire(callbacks);
          }
        }, fallback, async);
      }
    }

    function importFirstURL(urls, callback, fallback, nesting, async) {
      var url = urls.shift();
      var imported = cache.get(url);
      self.importedResources.push(imported);
      imported.load(
        function importSucceeded() {
          debug('calling callback,', url, ' loaded OK');

          callback();
        }, 
        // `importFailed` is the fallback function which is called when the 
        // imported resource couldn't be loaded.  There are two ways in which 
        // the load function can fail:
        // 1. the resource file could not be found at the specified URL and 
        // there are more locations to look for it in; in this case, look for 
        // the resource in a different location,
        // 2. the resource file could not be found and there are no more URLs 
        // to try;  in this case, the context cannot be integral and a subctx 
        // must be created
        // The second type of failure can happen for the resource that is 
        // currently being imported, as well as for any other nested import 
        // inside of it.  The `importFailed` fallback will be also called from 
        // this resource's `importResource` method (or this resource's 
        // children's `importResource` method).  We check for integrity errors 
        // to detect when the second type of failure has occurred somewhere 
        // deeper in the import tree.
        function importFailed(ex, bubble) {
          debug('calling fallback,', url, ' failed to load');
          var integrityErrors = L20n.NESTED_ERROR | L20n.IMPORT_ERROR;
          // if the exception is one of the preprocessing errors returned by 
          // a child resource, bubble it up and don't do anything else;  the 
          // exception needs to reach the context's handleException function; 
          // you can also force the bubbling up with the bubble argument
          if (ex.code & integrityErrors || bubble) {
            fallback(ex);
          } else if (urls.length == 0) {
            debug('no more scheme URLs to try');
            exception = new Exception(L20n.IMPORT_ERROR);
            fallback(exception);
          } else {
            if (env.DEBUG) {
              // bubble the exception up to the context to emit an error event
              // for debugging puposes
              fallback(ex, true);
            }
            imported.isCorrupted = true;
            // remove the imported resource from imports, so that we don't 
            // check if it's ready anymore
            var pos = self.importedResources.indexOf(imported);
            if (pos > -1) {
              self.importedResources.splice(pos, 1);
            }
            importFirstURL(urls, callback, fallback, nesting, async);
          }
        }, nesting, async);
    }

    this.importResource = function pr_importResource(uri, 
                                                     callback, 
                                                     fallback, 
                                                     nesting, 
                                                     async) {
      nesting = nesting || 0;
      if (nesting > 7) {
        exception = new Exception(L20n.NESTED_ERROR);
        fallback(exception);
        return false;
      }
      // in case the uri is defined in the l10n: scheme, resolve it
      var urls = resolveURI(uri);
      if (window.performanceTimer) {
          performanceTimer.setTimerCallback(urls[0], 'resloading', function(start, end) {
            if (async) {
              performanceTimer.addDataPoint('main', 'resloading (async)', uri, start, end);
            } else {
              performanceTimer.addDataPoint('main', 'resloading (sync)', uri, start, end);
            }
          });
          performanceTimer.setTimerCallback(urls[0], 'parsing', function(start, end) {
            performanceTimer.addDataPoint(uri, 'parsing', uri, start, end);
          });
      }
      importFirstURL(urls, callback, fallback, nesting, async);
      return true;
    }

    this.isComplete = function pr_isComplete() {
      if (this.importedResources.length != totalImports) {
        return false;
      }
      for (var i in this.importedResources) {
        if (!this.importedResources[i].isReady) {
          return false;
        }
      }
      return true;
    }
  }

  function Context() {

    var entries = {};     // resource entries
    var ctxdata = {};     // context variables
    var emitter = new L20n.EventEmitter();
    var settings = {
      'schemes': null,    // path schemes
      'locales': null,    // list of locale codes in priority order
      'timeout': 500,     // timeout for asynchronous resource loading
    };

    // when context is frozen, no more resources can be added to it
    var isFrozen = false;
    // context is integral when all the resources have been downloaded
    var isIntegral = null;
    // context is ready when it's integral and compiled
    var isReady = false;

    // the compiler is instantiated in the funciton when all when resources 
    // have been successfully loaded  successfully
    var compiler;

    // a subcontext can be created when 1) the context is not integral, or 2) 
    // the context is ready, but an entity couldn't be found in it
    var subctx;

    // contrary to the resCache, the cache for processed resources is 
    // per-context, because ProcessedResources keep reference to their parent 
    // context
    var cache = new Cache(this, ProcessedResource);

    // Context is a top-level resource that imports other resources.  The only 
    // difference is that a regular resource is a file, and the EOF marks the 
    // moment when the resource no longer accepts new imports.  For the 
    // context's meta resource we need the `freeze` method to simulate this 
    // behavior.
    var meta = new ProcessedResource(null, this, cache);
    // the URIs of all resources that have been addResource'd;  used for 
    // creating a subctx
    var uris = [];
    // uris' length, basically;  used in m_isComplete to make sure we're 
    // checking all resources for readiness
    var totalResources = 0;

    var self = this;

    meta.isComplete = function m_isComplete() {
      if (!isFrozen) {
        return false;
      }
      if (meta.importedResources.length != totalResources) {
        return false;
      }
      for (var i in this.importedResources) {
        if (!this.importedResources[i].isReady) {
          return false;
        }
      }
      isIntegral = true;
      return true;
    }

    function compile() {
      if (isReady) {
        return;
      }
      // flatten the AST
      meta.ast = meta.importedResources.reduce(function(prev, curr) {
        prev.body = prev.body.concat(curr.ast.body);
        return prev;
      }, meta.ast);
      compiler = new L20n.Compiler(L20n.EventEmitter, L20n.Parser);
      compiler.setGlobals(globals);
      if (window.performanceTimer) {
        var start = performanceTimer.getTime();
      }
      try {
        entries = compiler.compile(meta.ast)
      } catch (e) {
        if (!compiler) {
          debug('Compiler is not ready!');
        }
        var exception = new Exception(L20n.COMPILE_ERROR, 'Compile error', e);
        emitter.emit('error', exception);
        invalidate();
        return false;
      }
      if (window.performanceTimer) {
        performanceTimer.addDataPoint('main', 'compilation', null, start); 
      }
      isReady = true;
      debug('context ready, current locale is ', self.getLocale());
      emitter.emit('ready');
      return true;
    }

    function getArgs(data) {
      var args = Object.create(ctxdata);
      if (data) {
        for (var i in data) {
          args[i] = data[i];
        }
      }
      return args;
    }

    function createSubContext(async) {
      var subctx = new Context();
      if (self.settings.schemes) {
        subctx.settings.schemes = self.settings.schemes;
      }
      if (self.settings.locales && self.settings.locales.length > 1) {
        subctx.settings.locales = self.settings.locales.slice(1);
      } else {
        // XXX this should throw "entity not available"
        throw "No valid locales were available.";
      }
      debug('subcontext\'s locale is ', subctx.getLocale());
      uris.forEach(function(uri) {
        subctx.addResource(uri, async);
      });
      subctx.freeze();
      return subctx;
    }

    function invalidate() {
      isIntegral = false;
      meta.abortXHRs();
      debug('invalidated context\'s locale was ', self.getLocale());
      try {
        subctx = createSubContext(true);
      } catch (e) {
        var exception = new Exception(L20n.NOVALIDLOCALE_ERROR,
                                      'No valid locales available.');
        emitter.emit('error', exception);
        return false;
      }
      subctx.addEventListener('ready', function() {
        isReady = true;
        emitter.emit('ready');
      });
      return true;
    }

    function getSync(id, data) {
      if (!isReady) {
        throw "Error: context not ready";
      }
      if (!isIntegral) {
        return subctx.get(id, data);
      }
      var entity = entries[id];
      if (!entity) {
        debug('entity', id, 'not found, using subcontext');
        if (!subctx) {
          debug('creating subcontext');
          try {
            subctx = createSubContext(false);
          } catch (e) {
            var exception = new Exception(L20n.NOVALIDLOCALE_ERROR,
                                          'No valid locales available.');
            emitter.emit('error', exception);
            throw e;
          }
        }
        return subctx.get(id, data);
      }
      if (!entity || entity.local) {
        throw "No such entity: " + id;
      }
      var args = getArgs(data);
      return entity.toString(args);
    };

    function getAsync(id, data, callback, defaultValue) {
      if (isReady) {
        callback(getSync(id, data));
        return;
      }
      var overdue = false;
      var timeout = setTimeout(function() {
        overdue = true;
        // defaultValue is just a string, can't interpolate context data
        callback(defaultValue);
      }, settings.timeout);

      self.addEventListener('ready', function(event) {
        // if the event fired too late, the default value has already been used
        if (overdue) {
          return;
        }
        clearTimeout(timeout);
        callback(getSync(id, data));
      });
    };

    this.__defineSetter__('data', function(data) {
      ctxdata = data;
    });

    this.__defineGetter__('data', function() {
      return ctxdata;
    });

    Object.defineProperty(this, 'settings', {
      value: Object.create(Object.prototype, {
        locales: {
          get: function() { return settings.locales },
          set: function(val) {
            if (!Array.isArray(val)) {
              throw "Locales must be a list";
            }
            if (val.length == 0) {
              throw "Locales list must not be empty";
            }
            if (settings.locales !== null) {
              throw "Can't overwrite locales";
            }
            settings.locales = val;
            Object.freeze(settings.locales);
          },
          configurable: false,
          enumerable: true,
        },
        schemes: {
          get: function() { return settings.schemes },
          set: function(val) {
            if (!Array.isArray(val)) {
              throw "Schemes must be a list";
            }
            if (val.length == 0) {
              throw "Scheme list must not be empty";
            }
            if (settings.schemes !== null) {
              throw "Can't overwrite schemes";
            }
            settings.schemes = val;
            Object.freeze(settings.schemes);
          },
          configurable: false,
          enumerable: true,
        },
        timeout: {
          get: function() { return settings.timeout },
          set: function(val) {
            if (typeof(val) !== 'number') {
              throw "Timeout must be a number";
            }
            settings.timeout = val;
          },
          configurable: false,
          enumerable: true,
        },
      }),
      writable: false,
      enumerable: false,
      configurable: false,
    });

    this.getLocale = function ctx_getLocale() {
      if (!settings.locales || settings.locales.length == 0) {
        return null;
      }
      return settings.locales[0];
    };

    // clear this context's ProcessedResources cache
    this.invalidateCache = function ctx_invalidateCache() {
      return cache.invalidate();
    };

    function handleExceptions(exception) {
      var integrityErrors = L20n.NESTED_ERROR | L20n.IMPORT_ERROR;
      if (isIntegral === null && exception.code & integrityErrors) {
        exception.code |= L20n.INTEGRITY_ERROR;
        emitter.emit('error', exception);
        invalidate();
      } else if (env.DEBUG) {
        emitter.emit('error', exception);
      }
      return false;
    }

    this.addResourceSource = function ctx_addResourceSource(lol) {
      if (isFrozen) {
        throw "Context is frozen, can't add more resources";
      }
      if (!L20n.parser) {
        L20n.parser = new L20n.Parser(L20n.EventEmitter);
      }
      if (window.performanceTimer) {
        var start = performanceTimer.getTime();
      }
      var ast = L20n.parser.parse(lol);
      if (window.performanceTimer) {
        performanceTimer.addDataPoint('main', 'parsing', 'inline', start);
      }
      meta.ast.body = meta.ast.body.concat(ast.body);
    };

    this.addResource = function ctx_addResource(uri, async) {
      if (isFrozen) {
        throw "Context is frozen, can't add more resources";
      }
      if (async === undefined) {
        async = true;
      }
      uris.push(uri);
      meta.importResource(uri, _ifComplete(meta, compile), handleExceptions, 0,
                          async);
      return true;
    };

    this.freeze = function ctx_freeze() {
      isFrozen = true;
      totalResources = uris.length;
      _ifComplete(meta, compile)();
      return true;
    };

    this.get = function ctx_get(id, data, callback, fallback) {
      if (callback === undefined) {
        if (window.performanceTimer) {
          var start = performanceTimer.getTime();
        }
        var d = getSync(id, data);
        if (window.performanceTimer) {
          performanceTimer.addDataPoint(self.id, 'execution', id, start);
        }
        return d;
      }
      getAsync(id, data, callback, fallback);
      return null;
    };

    this.getAttribute = function ctx_getAttribute(id, attr, data) {
      if (!isReady) {
        throw "Error: context not ready";
      }
      var entity = entries[id];
      if (!entity || entity.local) {
        throw "No such entity: " + id;
      }
      var attribute = entity.attributes[attr]
      if (!attribute || attribute.local) {
        throw "No such attribute: " + attr;
      }
      var args = getArgs(data);
      return attribute.toString(args);
    };

    this.getAttributes = function ctx_getAttributes(id, data) {
      if (!isReady) {
        throw "Error: context not ready";
      }
      var entity = entries[id];
      if (!entity || entity.local) {
        throw "No such entity: " + id;
      }
      var args = getArgs(data);
      var attributes = {};
      for (var attr in entity.attributes) {
        var attribute = entity.attributes[attr];
        if (!attribute.local) {
          attributes[attr] = attribute.toString(args);
        }
      }
      return attributes;
    }

    this.addEventListener = function ctx_addEventListener(type, listener) {
      return emitter.addEventListener(type, listener);
    }

    this.removeEventListener = function ctx_removeEventListener(type, listener) {
      return emitter.removeEventListener(type, listener)
    }
  }
}).call(this);
