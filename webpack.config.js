/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const JSON6 = require("json-6")

const fs = require("fs-extra")
const path = require("path")
const webpack = require("webpack")

const BannerPlugin = webpack.BannerPlugin
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const EnvironmentPlugin = webpack.EnvironmentPlugin
const ModuleConcatenationPlugin = webpack.optimize.ModuleConcatenationPlugin
const OptimizeJsPlugin = require("optimize-js-plugin")
const ShakePlugin = require("webpack-common-shake").Plugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const readJSON = (filename) => JSON6.parse(fs.readFileSync(filename))

const builtins = [
  "Array", "ArrayBuffer", "Atomics", "Boolean", "Buffer", "DataView", "Date",
  "Error", "EvalError", "Float32Array", "Float64Array", "Function", "Infinity",
  "Int8Array", "Int16Array", "Int32Array", "Intl", "JSON", "Map", "Math", "NaN",
  "Number", "Object", "Promise", "Proxy", "RangeError", "ReferenceError",
  "Reflect", "RegExp", "Set", "SharedArrayBuffer", "String", "Symbol",
  "SyntaxError", "TypeError", "URIError", "Uint8Array", "Uint16Array",
  "Uint32Array", "Uint8ClampedArray", "WeakMap", "WeakSet", "WebAssembly",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",
  "process"
]

const isProd = /production/.test(process.env.NODE_ENV)
const isTest = /test/.test(process.env.NODE_ENV)

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
    path: path.resolve(__dirname, "build")
  },
  module: {
    rules: [{
      test: /\.js$/,
      loader: "babel-loader"
    }]
  },
  plugins: [
    new BannerPlugin({
      banner: [
        '"use strict";\n',
        "var __shared__;",
        "const __non_webpack_module__ = module;",
        "const " +
          builtins
            .map((name) => name + " = global." + name)
            .join(", ") +
        ";\n"
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
      ESM_VERSION: readJSON("./package.json").version
    })
  ]
}
/* eslint-enable sort-keys */

if (isProd) {
  config.plugins.push(
    new OptimizeJsPlugin,
    new ShakePlugin,
    new ModuleConcatenationPlugin,
    new EnvironmentPlugin({
      NODE_DEBUG: false
    }),
    new UglifyJSPlugin({
      uglifyOptions: readJSON("./.uglifyrc")
    })
  )
}

if (isTest) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.entry = "./src/entry.js"
  config.entry.runtime = "./src/runtime.js"
  config.entry["get-file-path-from-url"] = "./src/util/get-file-path-from-url.js"
}

module.exports = config
