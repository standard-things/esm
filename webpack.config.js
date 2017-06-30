"use strict"

const path = require("path")
const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const config = {
  "target": "node",
  "entry": {
    "esm": "./src/index.js"
  },
  "node": {
    "module": false
  },
  "output": {
    "libraryTarget": "commonjs2",
    "filename": "[name].js",
    "path": path.join(__dirname, "build")
  },
  "plugins": [
    new webpack.BannerPlugin({
      banner: "const __non_webpack_module__ = module",
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

if (process.env.NODE_ENV === "production") {
  config.plugins.push(
    new webpack.optimize.ModuleConcatenationPlugin,
    new UglifyJSPlugin({
      "compress": {
        "collapse_vars": true,
        "negate_iife": false,
        "pure_getters": true,
        "unsafe": true,
        "warnings": false
      },
      "mangle": {
        "toplevel": true
      },
      "output": {
        "ascii_only": true
      }
    })
  )
} else {
  config.entry.compiler = "./src/compiler.js"
  config.entry.runtime = "./src/runtime.js"
}

module.exports = config
