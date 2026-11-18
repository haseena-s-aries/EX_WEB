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
      // Native-only TurboModule spec; web code paths use <input type="file">. Keep this a warning,
      // as in earlier builds, instead of failing the whole web build.
      test: /[\\/]node_modules[\\/]@react-native-documents[\\/]picker[\\/]/,
      parser: {exportsPresence: 'warn'},
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
              for (const filename of ['config.js', 'web.config', 'ex-survey.css', 'ex-landing.css', 'ex-typography.css', 'ex-fieldwork.css', 'manifest.webmanifest', 'fieldwork-icon.svg',
                'fonts/Montserrat-Variable.ttf', 'fonts/Montserrat-Italic-Variable.ttf', 'fonts/OFL-Montserrat.txt']) {
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
    {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap('FieldworkOfflineShell', compilation => {
          compilation.hooks.processAssets.tap({name:'FieldworkOfflineShell',stage:webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT}, () => {
            // Development emits a network-first worker so the local offline workflow can be tested
            // without a production deployment; hot-update files are never precached.
            const mode = compiler.options.mode === 'production' ? 'production' : 'development';
            const assets = Object.keys(compilation.assets).filter(name => !name.endsWith('.map') && name !== 'web.config' && !name.includes('hot-update'));
            const revision = (mode === 'development' ? 'dev-' : '') + require('crypto').createHash('sha256').update(assets.map(name => compilation.assets[name].source()).join('')).digest('hex').slice(0,16);
            const worker = fs.readFileSync(path.resolve(__dirname,'public/fieldwork-worker.js'),'utf8').replace('__REVISION__',revision).replace('__ASSETS__',JSON.stringify(assets)).replace('__MODE__',mode);
            compilation.emitAsset('fieldwork-worker.js',new webpack.sources.RawSource(worker));
          });
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
