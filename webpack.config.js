"use strict"

const path = require("path")
const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const ConcatSource = require("webpack-sources").ConcatSource
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

function BabelDefinePlugin(babel) {
  const t = babel.types

  function MemberExpression(path) {
    const node = path.node
    const object = node.object
    const property = node.property

    if (! path.get("object").matchesPattern("process.env")) {
      return
    }
    const key = path.toComputedKey()
    if (t.isStringLiteral(key)) {
      const value = key.value
      if (value === "ESM_VERSION") {
        const version = require("./package.json").version
        path.replaceWith(t.valueToNode(version))
      }
    }
  }
  return { visitor: { MemberExpression } }
}

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
    "esm": "./index.js"
  },
  "node": {
    "module": false
  },
  "output": {
    "libraryTarget": "commonjs2",
    "filename": "[name].js",
    "path": path.join(__dirname, "dist")
  },
  "module":  {
    "rules": [{
      "test": /\.js$/,
      "loader": "babel-loader",
      "options": {
        "plugins": [
          BabelDefinePlugin
        ],
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
  config.entry.compiler = "./lib/compiler.js"
  config.entry.runtime = "./lib/runtime.js"
}

module.exports = config
