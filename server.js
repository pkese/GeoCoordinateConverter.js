
// parse command line arguments

var default_port = process.env.PORT || '5000'; // heroku compatible

var opts = require('nomnom')
    .script("server")
    .options({
      port: {abbr:'p', metavar:'PORT', type:'string', default:default_port, help:"Base address:port to listen on"},
      rails: {abbr:'r', metavar:'RAILS_URL', help:"Rails server to proxy API requests to, e.g. http://localhost:5000"},
      dev: {abbr:'d', metavar:'URL', help:"Instrument webpack-dev-server by telling it the URL of your site, e.g. http://localhost:2222"},
      inline: {abbr:'di', flag:true, help:"Make webpack-dev-server to run in 'inline' mode"},
      hot: {abbr:'dh', flag:true, help:"Make webpack-dev-server to run in 'hot' mode"},
    })
    .parse()


// optional webpack-dev-server support
//
var wpconfig = require('./webpack.config.js');
var webpack_dev_server = function(url, inline, hot) {

  dev_url = require('url').parse(url)

  var webpack = require('webpack');
  var WebpackDevServer = require('webpack-dev-server');

  if (inline) {
    var devClient = [require.resolve("webpack-dev-server/client/") + "?" + url];
    if (hot) {
      devClient.push("webpack/hot/dev-server");
    };
    [].concat(wpconfig).forEach(function(wpconfig) {
      if(typeof wpconfig.entry === "object") {
        Object.keys(wpconfig.entry).forEach(function(key) {
          wpconfig.entry[key] = devClient.concat(wpconfig.entry[key]);
        });
      } else {
        wpconfig.entry = devClient.concat(wpconfig.entry);
      }
    });
  }

  // ----- webpack-dev-server config ------------------
  var wpserver = new WebpackDevServer(webpack(wpconfig), {
      contentBase: __dirname,

      hot: hot,
      // Enable special support for Hot Module Replacement
      // Page is no longer updated, but a "webpackHotUpdate" message is send to the content
      // Use "webpack/hot/dev-server" as additional module in your entry point
          // Note: this does _not_ add the `HotModuleReplacementPlugin` like the CLI option does.

      quiet: false,
      noInfo: false,
      publicPath: wpconfig.output.publicPath, // "/app/",

      headers: { "Access-Control-Allow-Origin": dev_url.protocol + "://" + dev_url.hostname + ":*"},
      stats: { colors: true }
  });
  //wpserver.listen(dev_url.port, dev_url.hostname, function() {});
  return {app: wpserver.app, server: wpserver.listeningApp, listener: wpserver};
}

// production server (when no webpack-dev-server is configured)
//
var http = require('http');
var express = require('express');

var production_server = function() {
  var app = express();
  var server = http.Server(app);
  return {app: app, server: server, listener:server};
}

// instantiate production -or- webpack server
//
var server_config;
if (opts.dev) {
  server_config = webpack_dev_server(opts.dev, opts.inline, opts.hot);
} else {
  server_config = production_server()
}

// express.js server & routing
//
var app = server_config.app;

// logging incoming http requests
if (opts.dev) {
  app.use(function(req, res, next) {
    console.log(req.path);
    next();
  });
}

// serve static content based on ./webpack.config.js setup
//
app.use(require('compression')());
app.use('/build/', express.static(wpconfig.output.path))

// optionally proxy some requests to Rails
//
if (opts.rails) {
  var rails_url = require('url').parse(opts.rails);
  var sendfile = require('send');
  var proxy = require('http-proxy').createServer({target:opts.rails, changeOrigin:true})
  var rails = function(req, res, next) {
    //console.log('proxying', req.path, 'to', opts.rails);
    req.headers['host'] = rails_url.hostname;
    proxy.web(req, res);
  }

  var rails_alt_index_proxy = function(req, res, next) {
    //proxy '/' to rails  ===>  keep 'set-cookie' header ===> serve static 'index.html'
    //console.log('proxy req', req.path, req.originalUrl, req.headers);
    req.headers['connection'] = 'close';
    if (!req.headers['x-forwarded-for']) {
      req.headers['X-Forwarded-For'] = req.headers.host;
      req.headers['host'] = rails_url.hostname;
    }
    var options = {
      hostname: rails_url.hostname,
      port: rails_url.port,
      pathname: '/play.json',
      headers: req.headers,
    }
    http.request(options, function(proxyRes) {
      if (res.statusCode != 200) {
        console.log('index.html proxy response from', rails_url.hostname, ':', res.statusCode);
      }
      proxyRes.on('data', function(chunk) {/* throw away */})
      var cookie = proxyRes['set-cookie']; // take the cookie served by Rails
      if (cookie) res.setHeader('Set-Cookie', cookie); // and paste it into our response
      //console.log('serving static', req);
      sendfile(req,'/index.html', {root:__dirname}).pipe(res);
      //express.static(__dirname)(req, res, next);
    }).end();
  }

  // define which URLs to proxy to Rails
  app.get('/', rails_alt_index_proxy);
  app.use('/play/', rails_alt_index_proxy);
  app.use('/scratchpad', rails_alt_index_proxy);
  app.use('/api', rails);
  app.use('/:lang([a-z][a-z])', rails_alt_index_proxy);
  app.all('*', rails)
} else {
  app.get('/', express.static(__dirname)); // index.html
  app.get('*', express.static(wpconfig.output.path))
}


// socket.io
//
var io = require('socket.io').listen(server_config.server, {path:'/film.io'});//, {origins: 'localhost:*'});
io.on('connection', function (socket) {
  console.log('a user connected');
  //@@
  socket.emit('news', { hello: 'world' });
  socket.on('log', function (data) {
    console.log('film log:', data);
  });
  socket.on('error', function(exc) {
    console.log('film socket error', exc.toString())
  });
});

var listen=opts.port.split(':');
if (listen.length==1) {
  var port=listen[0];
  console.log('Listening on port: '+port);
  server_config.listener.listen(port);
} else {
  var addr=listen[listen.length-2];
  var port=listen[listen.length-1];
  console.log('Listening on: '+addr+':'+port);
  server_config.listener.listen(port, addr);
}
