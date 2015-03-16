// webpack.config.js

var webpack = require('webpack');
var common_packer = new webpack.optimize.CommonsChunkPlugin('common.js');
var autoprefixer = require('autoprefixer');

var add_language_entries = function(entry_dict) {
  // read languages from l10ns config and add it to an entry dict
  var l10ns = require('./l10ns.json').projects['123film'];
  var dir = './'+l10ns.output+'/';
  for (var lang in l10ns.languages) {
    entry_dict['lang-'+lang] = [dir+lang+'.js'];
  }
  entry_dict['lang-all'] = [dir+'all.js'];
  return entry_dict;
}

module.exports = {

  context: __dirname,
  //entry: add_language_entries({
  entry: {
    app: './app/App.jsx',
    //CodeEntry: ['./client/Code/CodeEntry'],
    //Playback: ['./client/Playback'],
    vendor: ['react','react-router','normalize.css/normalize.css','superagent'], //'socket.io-client'],
/*
    bundle: [
      //'webpack-dev-server/client?http://localhost:2222',
      //'webpack/hot/dev-server',
      './client/index.js'
    ],
*/
  },
  output: {
    path: __dirname + '/build',
    publicPath: '/build/',
    filename: '[name].js',
    //chunkFilename: 'chunk.[id].[name].[chunkhash].js',
  },
  module: {
    loaders: [
      // loaders can take parameters as ?querystrings
      //{test: /\.js?x$/, loaders: ['react-hot', 'jsx?harmony'], exclude: /node_modules/ },
      {test: /\.js/, loaders: ['react-hot', 'babel'], exclude: /node_modules/ }, // loaders can take parameters as a querystring
      {test: /\.scss$/, loader: 'style!css!postcss-loader!sass?outputStyle=expanded'},
      {test: /\.css$/, loader: 'style!css'},
      /*{test: /\.svg$/, loader: 'url-loader?'},*/
      {test: /\.(png|jpg|svg)$/, loader: 'url-loader?limit=8192'},
      {test: /\.json$/, loader: 'json-loader'},
    ],
  },
  postcss: { defaults: [autoprefixer] },
  resolve: {
    // you can now require('file') instead of require('file.coffee')
    extensions: ['', '.jsx', '.js', '.json']
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.CommonsChunkPlugin(/* chunkName= */"vendor", /* filename= */"vendor.js"),
    common_packer
  ]
};
