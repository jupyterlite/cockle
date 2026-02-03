const path = require('path');

const entry = process.env.COCKLE_LOCAL_CORS ? './serve/index_local_cors.ts' : './serve/index_remote_cors.ts'

module.exports = {
  mode: 'development',
  entry,
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
    extensions: ['.ts', '.js']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'lib')
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'assets')
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    port: 4501
  }
};
