/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const download = require("download")
const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
const pify = require("pify")
const trash = require("trash")

const argv = require("yargs")
  .boolean("prod")
  .boolean("test")
  .argv

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  (argv.test ? "-test" : "")

const rootPath = path.join(__dirname, "..")
const buildPath = path.join(rootPath, "build")
const bundlePath = path.join(buildPath, "esm.js")
const gzipPath = path.join(rootPath, "esm.js.gz")
const vendorPath = path.join(rootPath, "src/vendor")

const acornPath = path.join(vendorPath, "acorn")
const acornPkg = require("acorn/package.json")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const punycodePath = path.join(vendorPath, "punycode")
const punycodePkgPath = path.dirname(require.resolve("punycode/package.json"))

const uglifyPluginPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uglifyPluginPath, "node_modules/uglify-es")

const removeDepsRegExp = /,\s*"dependencies":[^]*?\}/m

const trashPaths = [
  buildPath,
  gzipPath,
  uglifyPath
]

const webpackArgs = [
  argv.prod && ! argv.test
    ? "--display-optimization-bailout"
    : "--hide-modules"
]

/* eslint consistent-return: off */
Promise
  .all(trashPaths.map(trash))
  .then(() => {
    if (! fs.pathExistsSync(acornPath)) {
      return download(acornURL, acornPath, {
        extract: true,
        filter: (file) => /^(?:pack|src).*?\.(?:js|json)$/.test(file.path),
        headers: { accept: "application/zip" },
        mode: "666",
        strip: 1
      })
    }
  })
  .then(() => {
    if (! fs.pathExistsSync(punycodePath)) {
      return fs.copy(punycodePkgPath, punycodePath)
    }
  })
  .then(() => execa("webpack", webpackArgs, {
    cwd: rootPath,
    env: { NODE_ENV },
    stdio: "inherit"
  }))
  .catch((e) => process.exit(e.code))
  .then(() => {
    if (argv.prod) {
      return Promise.all([
        () => {
          // Remove dependencies from package.json.
          const jsonPath = path.join(rootPath, "package.json")
          return fs.readFile(jsonPath, "utf8")
            .then((jsonText) => fs.writeFile(jsonPath, jsonText.replace(removeDepsRegExp, "")))
        },
        () => {
          /* eslint import/no-extraneous-dependencies: off */
          const gzip = pify(require("node-zopfli").gzip)
          return fs.readFile(bundlePath)
            .then((buffer) => gzip(buffer, { numiterations: 100 }))
            .then((buffer) => fs.writeFile(gzipPath, buffer))
        }
      ].map((cb) => cb()))
    }
  })
