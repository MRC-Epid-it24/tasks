const path = require('node:path');
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const WebpackBar = require('webpackbar');

module.exports = (env) => {
  const { NODE_ENV = 'development' } = env;
  const isDev = NODE_ENV === 'development';

  return {
    entry: {
      index: path.resolve('./src/index.ts'),
      cli: path.resolve('./src/cli.ts'),
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
    },
    mode: NODE_ENV,
    target: 'node',
    watch: isDev,
    devtool: isDev ? 'source-map' : undefined,
    optimization: {
      minimize: false,
    },
    externals: [nodeExternals()],
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: './tsconfig.json',
          logLevel: 'info',
          logInfoToStdOut: true,
          extensions: ['.ts'],
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new NodemonPlugin({
        nodeArgs: ['--inspect=5858'],
      }),
      new WebpackBar({ name: 'Tasks' }),
    ],
  };
};
