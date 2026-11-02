const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const webpack = require('webpack');

module.exports = {
  target: 'web',
  devtool: 'source-map',
  entry: path.resolve(__dirname, 'index.web.js'),
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.web.js', '.js', '.web.tsx', '.tsx', '.web.ts', '.ts'],
    alias: {
      'react-native$': 'react-native-web',
    },
  },
  module: {
  rules: [
    {
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /node_modules\/(?!(react-native-.*|@react-navigation|react-native)\/)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}}],
            'module:@react-native/babel-preset',
          ],
          plugins: ['react-native-web'],
        },
      },
    },
    {
      test: /\.(png|jpe?g|gif|svg)$/,
      type: 'asset/resource',
    },
  ],
},
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap('IISHostingFiles', compilation => {
          compilation.hooks.processAssets.tap(
            {
              name: 'IISHostingFiles',
              stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            () => {
              for (const filename of ['config.js', 'web.config']) {
                compilation.fileDependencies.add(path.resolve(__dirname, 'public', filename));
                compilation.emitAsset(filename, new webpack.sources.RawSource(
                  fs.readFileSync(path.resolve(__dirname, 'public', filename)),
                ));
              }
            },
          );
        });
      },
    },
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
    }),
  ],
  devServer: {
    port: 3000,
    open: true,
    hot: true,
    client: {
      overlay: true,
    },
  },
};
