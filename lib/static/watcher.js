(function ($) {

  /**
   * Configuration
   */

  var prefix  = '_wander'
    , urlAttr = {
        link   : 'href'
      , img    : 'src'
      , script : 'src'
    };


  /**
   * Load served assets paths (stylesheets, images, scripts)
   *
   * TODO: parse stylesheets to get @import urls
   */

  function loadFiles () {
    var paths = []
      , elems = {}
      , loc   = window.location
      , host  = loc.host
      , self  = loc.pathname.replace(/^\/|\/$/g, '');

    paths.push(self || 'index.html');

    $('link[rel="stylesheet"],img[src],script[src]')
      .map(_parse)
      .filter(_local)
      .each(_add);

    function _parse (i, el) {
      var $el = $(el)
        , tag = $el.prop('tagName').toLowerCase()
        , url = $el.attr(urlAttr[tag])
        , urp = parseURL(url);
      urp._tag = tag;
      urp._ele = $el;
      return urp;
    }

    function _local () {
      return (this.host == host && this._path.indexOf(prefix) == -1);
    }

    function _add (i, urp) {
      elems[urp._path] = urp._ele;
      paths.push(urp._path);
    }

    return {
        paths    : paths
      , elements : elems
    };
  }


  /**
   * Parse a URL, returning an <A> element (which can be used to access
   * protocol, host, pathname, etc.)
   */

  function parseURL (url) {
    var u = $('<a>', { href: url }).get(0);
    u._query = parseQS(u.search);
    u._path  = normalize(u.pathname);
    return u;
  }


  /**
   * Parse a query string
   */

  function parseQS (qs) {
    var query = {}
      , parts = qs.substring(1).split('&');

    $.each(parts, function (i, part) {
      if (!part) return;
      var pair = part.split('=')
        , key  = pair[0]
        , val  = pair.length == 1 ? true : decodeURIComponent(pair[1]);
      query[key] = val;
    });

    return query;
  }


  /**
   * Normalize a path (removing slashes, etc.)
   */

  function normalize (p) {
    return p.replace(/\/+/g, '/').replace(/^\//, '');
  }


  /**
   * Format a parsed query string back into a string
   */

  function formatQS (query) {
    var qs = [];

    $.each(query, function (key, value) {
      qs.push(key + '=' + encodeURIComponent(value));
    });

    return '?' + qs.join('&');
  }


  /**
   * POST a JSON request to the watcher handler
   */

  function post (data, callback) {
    return $.ajax({
        type        : 'POST'
      , url         : '/' + prefix + '/watch'
      , contentType : 'application/json; charset=utf-8'
      , data        : JSON.stringify(data)
      , dataType    : 'json'
      , success     : callback
    });
  }


  /**
   * Start monitoring assets
   */

  function monitor () {
    var watch = loadFiles()
      , data  = { files : watch.paths };

    _post();

    function _post () {
      console.log('monitor: %d files', data.files.length);
      console.log(data.files.join('\n'));
      post(data, _responded);
    }

    function _reload () {
      window.location.reload();
    }

    function _responded (info) {
      console.log('%s: %s', info.event, info.file);
      var ext = info.file.split('.').slice(-1)
        , re  = _reload;
      if (ext == 'css') {
        _update(info.file);
        re = _post;
      }
      setTimeout(re, 500);
    }

    function _update (path) {
      if (!watch.elements[path]) return;

      console.log('reloading css: %s', path);
      var $link = watch.elements[path]
        , url   = parseURL($link.attr('href'))
        , query = url._query;

      query['_watch_cache'] = Date.now();
      url.search = formatQS(query);
      $link.attr('href', url.href);
    }
  }

  $(monitor);

})(window.jQuery);
