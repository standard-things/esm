"use strict"

const path = require("path")
const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const OptimizeJsPlugin = require("optimize-js-plugin")
const ShakePlugin = require("webpack-common-shake").Plugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const NODE_ENV = String(process.env.NODE_ENV)
const isProduction = NODE_ENV.startsWith("production")
const isTest = NODE_ENV.endsWith("test")

const config = {
  target: "node",
  entry: {
    esm: "./src/index.js"
  },
  output: {
    libraryExport: "default",
    libraryTarget: "commonjs2",
    filename: "[name].js",
    path: path.join(__dirname, "build")
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: "babel-loader",
      options: {
        plugins: [
          "transform-for-of-as-array"
        ],
        presets: [
          ["env", {
            modules: false,
            exclude: [
              "check-es2015-constants",
              "transform-async-to-generator",
              "transform-es2015-block-scoping",
              "transform-es2015-classes",
              "transform-es2015-for-of",
              "transform-es2015-function-name",
              "transform-es2015-object-super",
              "transform-regenerator"
            ],
            targets: { node: 4 }
          }]
        ]
      }
    }]
  },
  plugins: [
    new webpack.BannerPlugin({
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
    new webpack.EnvironmentPlugin({
      ESM_VERSION: require("./package.json").version
    })
  ]
}

if (isProduction) {
  config.plugins.push(
    new OptimizeJsPlugin,
    new ShakePlugin,
    new webpack.optimize.ModuleConcatenationPlugin,
    new webpack.EnvironmentPlugin({
      NODE_DEBUG: false
    }),
    new UglifyJSPlugin({
      uglifyOptions: {
        toplevel: true,
        compress: {
          keep_infinity: true,
          negate_iife: false,
          passes: 3,
          pure_getters: true,
          unsafe: true
        },
        output: {
          ascii_only: true,
          wrap_iife: true
        }
      }
    })
  )
}

if (isTest) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.runtime = "./src/runtime.js"
  config.module.rules[0].options.presets[0][1].debug = true
}

module.exports = config
