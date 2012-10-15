#!/usr/bin/env node

/*!
 * wander
 * Copyright (c) 2012 Zaim Bakar
 */

var path    = require('path')
  , connect = require('connect')
  , program = require('commander')
  , watcher = require('./lib');


/**
 * Default HTTP port
 */

var PORT = 3000;


/**
 * Die, with or without last words
 */

function die (err, h) {
  if (err) console.error('' + err);
  if (h)   console.error(program.helpInformation() + help());
  process.exit(err ? 1 : 0);
}


/**
 * Create a prefixed logger function
 */

function logger (prefix) {
  logger._st || (logger._st = new Date);
  return function () {
    var ms = (new Date) - logger._st;
    arguments[0] = prefix + arguments[0] + ' (+' + ms + 'ms)';
    console.log.apply(console, arguments);
  };
}


/**
 * Serve directory at `port`, together with the watcher middleware
 */

function serve (dirs, port, log) {
  var app = connect();

  app.use(connect.json());
  app.use(watcher({ paths: dirs, log: log}));

  dirs.forEach(function (dir) {
    app.use(connect.static(dir));
  });

  app.use(connect.errorHandler());
  app.listen(port || PORT);
}


/**
 * Execute command on changes to `dir`
 */

function execute (dirs, cmd, log) {
  watcher.execute(dirs, cmd, function (event, file, info) {
    log('%s: %s', event, file);
    log('>> %s', info.command);
    info.process.stdout.pipe(process.stdout);
    info.process.stderr.pipe(process.stderr);
  });
}


/**
 * Extra help info
 */

function help () {
  return [
    '  The --dir option may be repeated for multiple directories.'
  , '  Sets of --dir and "action" options may also be repeated for'
  , '  multiple watcher instances.'
  , ''
  , '  Examples:'
  , ''
  , '    Serve "www/" directory via port 8080:'
  , ''
  , '      $ %s -d www/ -s 8080'
  , ''
  , '    Execute "make" on changes in "assets/",'
  , '    which would then produce files in "build/www",'
  , '    which in turn would be served via default port 3000:'
  , ''
  , '      $ %s -d assets/ -e make -d build/www -s'
  , ''
  ].join('\n').replace(/%s/g, program.name);
}


/**
 * The main function
 */

function main () {
  var dirs  = []
    , tasks = [];

  program
    .usage('-d <path> [action] ...')
    .option('-d, --dir <path>', 'path of directory to watch')
    .option('-e, --execute <command>', '(action) execute "command" on changes')
    .option('-s, --serve [port]', '(action) serve directory via http', PORT)
    .on('dir',     _dir)
    .on('execute', _task(execute))
    .on('serve',   _task(serve))
    .on('--help' , _help)
    .parse(process.argv);

  if (tasks.length == 0) {
    return die(null, true);
  }

  tasks.forEach(function (t) {
    var log = logger(t.action.name + ': ');
    t.paths.forEach(function (p) { log(p) });
    t.action.call(null, t.paths, t.argument, log);
  });

  function _dir (p) {
    dirs.push(path.normalize(p));
  }

  function _task (fn) {
    return function (arg) {
      tasks.push({
          paths    : dirs
        , action   : fn
        , argument : arg
      });
      dirs = [];
    };
  }

  function _help () {
    console.log(help());
  }
}

if (require.main === module) main();

