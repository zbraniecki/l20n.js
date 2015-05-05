'use strict';

// resolve relative to build/config
var path = require('path').resolve.bind(null, __dirname);

module.exports = {
  web: {
    context: path('../../src'),
    entry: {
      web: './runtime/web/index.js',
    },
    output: {
      path: path('../dist'),
      filename: '[name]/l10n3.js',
      libraryTarget: 'this',

    },
    module: {
      loaders: [{ 
        test: /\.js$/,
        include: [
          path('../../src')
        ],
        loader: 'babel-loader'
      }]
    }
  },
  node: {
    context: path('../../src'),
    entry: './bindings/node/index.js',
    output: {
      path: path('../dist'),
      filename: './node/l10n3.js',
      libraryTarget: 'commonjs2',
    },
    externals: {
      'querystring': true,
      'fs': true
    },
    module: {
      loaders: [{ 
        test: /\.js$/,
        include: [
          path('../../src')
        ],
        loader: 'babel-loader'
      }]
    }
  },
};
