const path = require('path');
const rules = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'source-map-loader'
  },
  {
    test: /\.ts$/,
    use: 'ts-loader',
    exclude: /node_modules/,
  },
];

const resolve = {
  fallback: {
    fs: false,
    child_process: false,
    crypto: false
  },
  extensions: ['.js', '.ts']
};

module.exports = [
  {
    entry: './src/shell_worker.ts',
    output: {
      filename: 'shell_worker.js',
      path: path.resolve(__dirname, 'lib', 'worker_bundle'),
      libraryTarget: 'amd'
    },
    module: {
      rules
    },
    devtool: 'source-map',
    resolve
  }
];
