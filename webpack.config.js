/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

const arrayRemove = require("./script/array-remove.js")
const fs = require("fs-extra")
const path = require("path")
const webpack = require("webpack")

const {
  BannerPlugin,
  EnvironmentPlugin,
  NormalModuleReplacementPlugin
} = webpack

const {
  ModuleConcatenationPlugin
} = webpack.optimize

const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
const OptimizeJsPlugin = require("optimize-js-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const UnusedPlugin = require("unused-webpack-plugin")

class WebpackTemplatePlugin {
  apply({ hooks: { compilation } }) {
    compilation.tap("MainTemplate", ({ mainTemplate: { hooks } }) => {
      // Simplify webpack module scaffolding.
      hooks.requireExtensions.tap("MainTemplate", () =>
        [
          "__webpack_require__.d = function (exported, name, get) {",
          "  Reflect.defineProperty(exported, name, {",
          "    configurable: true,",
          "    enumerable: true,",
          "    get",
          "  })",
          "}",
          "__webpack_require__.n = function (exported) {",
          "  exported.a = exported",
          "  return function () { return exported }",
          "}"
        ].join("\n")
      )

      // Remove webpack additions.
      hooks.render.tap("ModuleTemplate", ({ children }) => {
        const COMPATIBILITY_HELPER = "__webpack_require__.r(__webpack_exports__);\n"
        const USE_STRICT = '"use strict";\n'

        function shouldRemove(value) {
          return value === COMPATIBILITY_HELPER ||
                 value === USE_STRICT
        }

        arrayRemove(children, shouldRemove)

        for (let child of children) {
          do {
            arrayRemove(child.replacements, ({ content }) => shouldRemove(content))
          } while ((child = child._source))
        }
      })
    })
  }
}

const { ESM_ENV } = process.env

const {
  files: PACKAGE_FILENAMES,
  version: PACKAGE_VERSION
} = fs.readJSONSync("./package.json")

const isProd = /production/.test(ESM_ENV)
const isTest = /test/.test(ESM_ENV)

const externals = [
  "Array", "Buffer", "Error", "EvalError", "Function", "JSON", "Object",
  "Promise", "RangeError", "ReferenceError", "Reflect", "SyntaxError",
  "TypeError", "URIError", "eval"
]

const hosted = [
  "console"
]

const babelOptions = require("./.babel.config.js")
const terserOptions = fs.readJSONSync("./.terserrc")

const config = {
  devtool: false,
  entry: {
    esm: "./src/index.js"
  },
  mode: isProd ? "production" : "development",
  module: {
    rules: [
      {
        loader: "babel-loader",
        options: babelOptions,
        test: /\.js$/,
        type: "javascript/auto"
      }
    ]
  },
  node: false,
  optimization: {
    minimizer: [
      new TerserPlugin({ terserOptions })
    ],
    nodeEnv: false
  },
  output: {
    filename: "[name].js",
    libraryExport: "default",
    libraryTarget: "commonjs2",
    path: path.resolve("build"),
    pathinfo: false
  },
  plugins: [
    new BannerPlugin({
      banner: [
        "var __shared__;",
        "const __non_webpack_module__ = module;",
        "const __external__ = { " +
          externals
            .map((name) => name + ": global." + name)
            .join(", ") +
        " };",
        "const " +
          hosted
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
      PACKAGE_FILENAMES,
      PACKAGE_VERSION
    }),
    new ModuleConcatenationPlugin,
    new NormalModuleReplacementPlugin(
      /acorn[\\/]src[\\/]regexp\.js/,
      path.resolve("src/acorn/replacement/regexp.js")
    ),
    new UnusedPlugin({
      directories : [path.resolve("src")],
      exclude: [
        ".*",
        "*.json",
        "**/vendor/*"
      ],
      root : __dirname
    }),
    new WebpackTemplatePlugin
  ],
  target: "node"
}
/* eslint-enable sort-keys */

if (isProd) {
  config.plugins.push(
    new OptimizeJsPlugin,
    new EnvironmentPlugin({ NODE_DEBUG: false })
  )
}

if (isTest) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.entry = "./src/entry.js"
  config.entry.runtime = "./src/runtime.js"
  config.entry["get-file-path-from-url"] = "./src/util/get-file-path-from-url.js"
  config.entry["get-url-from-file-path"] = "./src/util/get-url-from-file-path.js"
}

module.exports = config
