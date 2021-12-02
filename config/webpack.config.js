const path = require('path');
const chalk = require('chalk');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const DllReferencePlugin = require('webpack/lib/DllReferencePlugin');
// const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const AutoDllPlugin = require('autodll-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, '..', 'src', 'index.js'),
  output: {
    filename: 'main.js',
    path: path.join(__dirname, '..', 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ProgressBarPlugin({
      format: 'build[:bar]' + chalk.green.bold(':percent') + '(:elapsedseconds)',
      clear: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '..', 'index.html'),
    }),
    // new DllReferencePlugin({
    //   manifest: require('../dist/react.manifest.json'),
    // }),
    // new DllReferencePlugin({
    //   manifest: require('../dist/polyfill.manifest.json'),
    // }),
    // new AddAssetHtmlPlugin([
    //   {
    //     filepath: path.join(__dirname, '..', 'dist', 'react.dll.js'),
    //     outputPath: '.',
    //     publicPath: '.',
    //   },
    //   {
    //     filepath: path.join(__dirname, '..', 'dist', 'polyfill.dll.js'),
    //     outputPath: '.',
    //     publicPath: '.',
    //   },
    // ]),
    new AutoDllPlugin({
      inject: true, // 设为 true 会把 Dll bundles 插到 index.html 里
      filename: '[name].dll.js',
      context: path.resolve(__dirname, '..'), // AutoDllPlugin 的 context 必须和 package.json 的同级目录，要不然会链接失败
      entry: { // 对应 webpack_dll.config.js 配置文件中的 entry
        react: [
          'react',
          'react-dom',
        ],
        polyfill: [
          'core-js/features/object/assign',
          'core-js/features/promise',
          'whatwg-fetch',
        ],
      },
    }),
  ],
};
