const path = require('path');

module.exports = {
  mode: 'development',
  entry: './serve/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        type: 'javascript/auto'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    // External commands are imported from ../test/serve, ensure they use this cockle not test's.
    alias: {
      '@jupyterlite/cockle': path.resolve(__dirname, 'node_modules/@jupyterlite/cockle')
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
