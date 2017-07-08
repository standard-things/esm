"use strict"

const path = require("path")
const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const NODE_ENV = String(process.env.NODE_ENV)

const config = {
  "target": "node",
  "entry": {
    "esm": "./src/index.js"
  },
  "output": {
    "libraryExport": "default",
    "libraryTarget": "commonjs2",
    "filename": "[name].js",
    "path": path.join(__dirname, "build")
  },
  "plugins": [
    new webpack.BannerPlugin({
      banner: [
        '"use strict";\n',
        "const __non_webpack_module__ = module;",
        "const __non_webpack_dirname__ = __dirname;\n"
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

if (NODE_ENV.startsWith("production")) {
  config.plugins.push(
    new webpack.optimize.ModuleConcatenationPlugin,
    new UglifyJSPlugin({
      "uglifyOptions": {
        "toplevel": true,
        "compress": {
          "keep_infinity": true,
          "negate_iife": false,
          "passes": 3,
          "pure_getters": true,
          "unsafe": true
        },
        "output": {
          "ascii_only": true
        }
      }
    })
  )
}

if (NODE_ENV.endsWith("test")) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.runtime = "./src/runtime.js"
}

module.exports = config
