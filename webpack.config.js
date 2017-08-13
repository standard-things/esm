/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const join = require("path").join
const webpack = require("webpack")
const readFileSync = require("fs").readFileSync

const BannerPlugin = webpack.BannerPlugin
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const EnvironmentPlugin = webpack.EnvironmentPlugin
const ModuleConcatenationPlugin = webpack.optimize.ModuleConcatenationPlugin
const OptimizeJsPlugin = require("optimize-js-plugin")
const ShakePlugin = require("webpack-common-shake").Plugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const NODE_ENV = String(process.env.NODE_ENV)
const isProduction = NODE_ENV.startsWith("production")
const isTest = NODE_ENV.endsWith("test")

/* eslint-disable sort-keys */
const config = {
  target: "node",
  entry: {
    esm: "./src/index.js"
  },
  output: {
    filename: "[name].js",
    libraryExport: "default",
    libraryTarget: "commonjs2",
    path: join(__dirname, "build")
  },
  module: {
    rules: [{
      test: /\.js$/,
      loader: "babel-loader",
      exclude: /node_modules/,
      options: JSON.parse(readFileSync("./.babelrc", "utf8"))
    }]
  },
  plugins: [
    new BannerPlugin({
      banner: [
        '"use strict";\n',
        "const __non_webpack_module__ = module;",
        "const __non_webpack_filename__ = __filename;\n"
      ].join("\n"),
      entryOnly: true,
      raw: true
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      defaultSizes: "gzip",
      logLevel: "silent",
      openAnalyzer: false,
      reportFilename: "report.html"
    }),
    new EnvironmentPlugin({
      ESM_VERSION: require("./package.json").version
    })
  ]
}
/* eslint-enable sort-keys */

if (isProduction) {
  config.plugins.push(
    new OptimizeJsPlugin,
    new ShakePlugin,
    new ModuleConcatenationPlugin,
    new EnvironmentPlugin({
      NODE_DEBUG: false
    }),
    new UglifyJSPlugin({
      uglifyOptions: JSON.parse(readFileSync("./.uglifyrc", "utf8"))
    })
  )
}

if (isTest) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.runtime = "./src/runtime.js"
  config.entry["url-to-path"] = "./src/util/url-to-path.js"
  config.module.rules[0].options.presets[0][1].debug = true
}

module.exports = config
