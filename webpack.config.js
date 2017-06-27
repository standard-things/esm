"use strict"

const path = require("path")
const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const ConcatSource = require("webpack-sources").ConcatSource
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")
const ESM_VERSION = require("./package.json").version

class EntryWrap {
  constructor(before, after) {
    this.before = before
    this.after = after
  }

  apply(compiler) {
    compiler.plugin("compilation", (compilation) => {
      const assets = compilation.assets
      compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
        const entries = chunks.filter((c) => c.hasEntryModule())
        entries.forEach((chunk) => {
          const file = chunk.files[0]
          assets[file] = new ConcatSource(
            this.before, "\n",
            compilation.assets[file], "\n",
            this.after
          )
        })
        callback()
      })
    })
  }
}

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
  "module":  {
    "rules": [{
      "test": /\.js$/,
      "loader": "babel-loader",
      "options": {
        "presets": [
          ["env", {
            "modules": false,
            "exclude": [
              "check-es2015-constants",
              "transform-es2015-arrow-functions",
              "transform-es2015-classes",
              "transform-es2015-function-name"
            ],
            "targets": { "node": 4 }
          }]
        ]
      }
    }]
  },
  "plugins": [
    new EntryWrap("const __non_webpack_module__ = module", ""),
    new webpack.EnvironmentPlugin({ ESM_VERSION }),
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      defaultSizes: "gzip",
      logLevel: "silent",
      openAnalyzer: false,
      reportFilename: "report.html"
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
