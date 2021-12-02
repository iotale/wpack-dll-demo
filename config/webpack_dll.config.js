const path = require('path');
const DllPlugin = require('webpack/lib/DllPlugin');

module.exports = {
  mode: 'production',
  entry: {
    react: ['react', 'react-dom'],
    polyfill: ['core-js/features/object/assign', 'core-js/features/promise', 'whatwg-fetch'],
  },
  output: {
    filename: '[name].dll.js',
    path: path.join(__dirname, '..', 'dist'),
    library: '_dll_[name]',
  },
  plugins: [
    new DllPlugin({
      name: '_dll_[name]',
      path: path.join(__dirname, '..', 'dist', '[name].manifest.json'),
      entryOnly: true,
    })
  ],
};
