  
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config().parsed;

const config ={
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(env),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    })
  ],
  resolve: {
    extensions: ['.ts', '.js', '.tsx'], // Add .ts to the list of resolved extensions
    fallback: {
      // Polyfills for Node.js globals and modules
      "crypto": require.resolve("crypto-browserify"),
      "Buffer": require.resolve('buffer/'),
      "process": require.resolve('process/browser.js'),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify"),
      "url": require.resolve("url"),
      "zlib": require.resolve('browserify-zlib'),
      "fs": require.resolve('fs'),
      // Add other necessary polyfills here
    },
  },
  target: "web",
  output: {
    publicPath: "/"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Regex to match both .ts and .tsx files
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name].[ext]',
            },
          },
        ],
      },
      // Add other loaders here as needed
    ],
  },
};

module.exports = config;