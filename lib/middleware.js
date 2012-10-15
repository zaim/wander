/*!
 * wandr
 * Copyright (c) 2012 Zaim Bakar
 */


/**
 * Module dependencies
 */

var path    = require('path')
  , util    = require('util')
  , connect = require('connect')
  , async   = require('async')
  , watcher = require('./watcher');


/**
 * Config: dir path for client-side static files
 */

var STATIC = path.join(__dirname, 'static');


/**
 * Config: watcher URLs
 */

var CLIENT_URL = '/_wander/client/'
  , WATCH_URL  = '/_wander/watch';


/**
 * No-op function
 */

var NOOP = function(){};


/**
 * Connect middleware
 *
 * @param {Array}   options.paths
 * @param {Boolean} options.quiet
 */

module.exports = function (options) {
  options || (options = {});

  var paths  = options.paths
    , log    = options.log || NOOP
    , client = connect.static(STATIC)
    , error  = connect.utils.error;

  if (typeof log === 'boolean') {
    log = log ? console.log : NOOP;
  }


  /**
   * Get full path for watched files, need to search for a match
   * within each watched path. First match is used.
   */

  function _which (files, callback) {
    async.map(files, _check, callback);
    function _check (file, next) {
      watcher.which(file, paths, function (p) {
        next(null, path.join(p, file));
      });
    }
  }


  /**
   * The file watcher handler
   */

  function _watcher (req, res, next) {
    var files = req.body.files
      , watch = null;

    if (!files) {
      return next(error(400, '"files" property missing'));
    }

    if (!util.isArray(files)) {
      return next(error(400, '"files" property must be an array'));
    }

    if (files.length == 0) {
      return next(error(400, '"files" array empty'));
    }

    _which(files, _monitor);

    function _monitor (err, files) {
      if (err) return next(err);
      files.forEach(function (f) { log('watch: %s', f) });
      watch = watcher.watch(files, true, _changed);
      req.on('close', _close);
    }

    function _changed (event, file) {
      var body = JSON.stringify({ event: event , file: file })
        , head = {
            'Content-Type'   : 'application/json'
          , 'Content-Length' : body.length
          };
      log('%s: %s', event, file);
      res.writeHead(200, head);
      res.end(body);
    }

    function _close () {
      log('request ended: stop monitor');
      watch.close();
    }
  }


  /**
   * Mini router: serve client or watcher?
   */

  return function _router (req, res, next) {
    // FIXME: parse URL to get actual pathname
    if (req.url.indexOf(CLIENT_URL) === 0) {
      req.url = req.url.slice(CLIENT_URL.length);
      return client(req, res, next);
    }

    if (req.url === WATCH_URL) {
      return _watcher(req, res, next);
    }

    next();
  };
};

