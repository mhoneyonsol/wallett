const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`
  config.ignoreWarnings = [/Failed to parse source map/];
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    vm: require.resolve('vm-browserify'),
    fs: false,
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
  };

  config.module.rules.push({
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: ['@babel/plugin-proposal-class-properties'],
      },
    },
  });

  // Add support for WebAssembly
  config.experiments = {
    asyncWebAssembly: true, // Enable async WebAssembly support
  };

  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async', // Set the module type for WebAssembly files
  });

  // Add ForkTsCheckerWebpackPlugin
  config.plugins.push(
    new ForkTsCheckerWebpackPlugin({
      async: false,
      typescript: {
        memoryLimit: 2048, // Set the memory limit (in MB)
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    })
  );

  return config;
});
