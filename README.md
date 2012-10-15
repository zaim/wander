wander
======

With `wander`, you can Watch files and Execute a command
or Reload a web page.

Usage
-----

    Usage: wander -d <path> [action] ...

    Options:

      -h, --help               output usage information
      -d, --dir <path>         path of directory to watch
      -e, --execute <command>  (action) execute "command" on changes
      -s, --serve [port]       (action) serve directory via http

    The --dir option may be repeated for multiple directories.
    Sets of --dir and "action" options may also be repeated for
    multiple watcher instances.

    Examples:

      Serve "www/" directory via port 8080:

        $ wander -d www/ -s 8080

      Execute "make" on changes in "assets/",
      which would then produce files in "build/www",
      which in turn would be served via default port 3000:

        $ wander -d assets/ -e make -d build/www -s

