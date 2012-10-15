/*!
 * wander
 * Copyright (c) 2012 Zaim Bakar
 */


/**
 * Module dependencies
 */

var path   = require('path')
  , fs     = require('fs')
  , proc   = require('child_process')
  , format = require('util').format
  , async  = require('async')
  , debug  = require('debug')('watcher');


/**
 * No-op function
 */

var NOOP = function(){};


/**
 * Config: buffer time in miliseconds to wait between change events
 */

var BUFFER = 250;


/**
 * Recursively read directory contents
 *
 * @param {String} dir Path to directory
 * @param {Function} callback Callback function
 */

exports.walk = function walk (dir, callback) {
  fs.readdir(dir, function (err, files) {
    if (err) return callback(err);
    async.map(files.filter(_visible), _map, _done);
  });

  function _visible (file) {
    return file[0] != '.';
  }

  function _map (file, next) {
    var fp = path.join(dir, file);
    fs.stat(fp, function (err, stat) {
      if (err) return next(err);
      if (stat.isFile()) return next(null, fp);
      if (stat.isDirectory()) return walk(fp, next);
    });
  }

  function _done (err, files) {
    if (err) return callback(err);
    callback(null, files.reduce(function (a, f) { return a.concat(f) }, []));
  }
};


/**
 * Determines which path within `paths` contains relative `file`
 *
 * @param {String} file
 * @param {Array}  paths
 * @param {Function} callback
 */

exports.which = function which (file, paths, callback) {
  async.detectSeries(paths, _check, callback);
  function _check (p, next) {
    path.exists(path.join(p, file), next);
  }
};


/**
 * Watch multiple files, calling `handler` on any file modification
 *
 * @param {Array} files The files to watch
 * @param {Boolean} close If true, only watch once, after first modification
 *                        is detected, close all watchers
 * @param {Function} handler The event handler
 */

exports.watch = function watch (files, close, handler) {
  var watchers = {}
    , timer = null;

  if (typeof close === 'function') {
    handler = close;
    close = false;
  }

  _open();

  function _open () {
    files.forEach(function (file) {
      debug('watch: %j', file);
      if (watchers[file]) watchers[file].close();
      try {
        watchers[file] = fs.watch(file, _handler(file));
      } catch (e) {
        // ENOENT = missing file, might have been renamed, so just ignore the
        // exception for now. if file is renamed temporarily (e.g. swap files
        // in vim), the next call of _open will re-watch it if the swap is
        // completed within 'BUFFER' miliseconds
        if (e.code !== 'ENOENT') throw e;
        else watchers[file] = null;
      }
    });
  }

  function _close () {
    for (var file in watchers) {
      if (watchers[file]) watchers[file].close();
    }
  }

  function _handler (file) {
    return function (event, name) {
      debug('watch: %s: %s', event, name);
      if (timer) clearTimeout(timer);
      timer = setTimeout(_emit, BUFFER, event, file, name);
    };
  }

  function _emit (event, file, name) {
    debug('watch: %s: %s (emit)', event, name);
    handler(event, file, name);
    (close ? _close : _open)();
  }

  return {
      open  : _open
    , close : _close
    , emit  : _emit
  };
}


/**
 * Watch entire directories recursively.
 *
 * @param {Array|String} dirs The directory paths
 * @param {Boolean} close
 * @param {Function} handler
 * @param {Function} callback (optional)
 */

exports.watchDir = function watchDir (dirs, close, handler, callback) {
  callback || (callback = NOOP);

  if (typeof dirs === 'string') dirs = [dirs];

  async.mapSeries(dirs, _walk, _done);

  function _walk (dir, next) {
    exports.walk(dir, function (err, files) {
      debug('watchDir: %s: %d files', dir, files.length);
      if (err) next(err);
      else next(null, files);
    });
  }

  function _done (err, files) {
    if (err) return callback(err);
    var all = files.reduce(function (a, f) { return a.concat(f) }, []);
    exports.watch(all, close, handler)
    callback(null);
  }
};


/**
 * Watch files in directories for changes, execute command `cmd` on changes.
 *
 * @param {Array|String} dirs
 * @param {String} cmd
 * @param {Function} handler (optional)
 */

exports.execute = function execute (dirs, cmd, handler) {
  handler || (handler = NOOP);

  var fmt = ~cmd.indexOf('%');
      wat = exports.watchDir(dirs, false, _changed);

  function _changed (event, file) {
    var c = fmt ? format(cmd, file) : cmd
      , p = proc.exec(c, NOOP);
    debug('execute: %s (pid: %s)', c, p.pid);
    handler(event, file, { command:c, process:p });
  }

  return wat;
};

