const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './serve/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
    // External commands are imported from ../sample-commands, ensure they use this cockle.
    alias: {
      '@jupyterlite/cockle': path.resolve(__dirname, 'node_modules/@jupyterlite/cockle')
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
