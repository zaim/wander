/*!
 * wander
 * Copyright (c) 2012 Zaim Bakar
 */

var watcher    = require('./watcher')
  , middleware = require('./middleware');

/**
 * Use the middleware function as main module export
 */

module.exports = middleware;

/**
 * Export other watcher utility functions under it
 */

for (var n in watcher) {
  if (watcher.hasOwnProperty(n)) {
    module.exports[n] = watcher[n];
  }
}
