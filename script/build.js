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
const vendorPath = path.join(rootPath, "src/vendor")
const buildPath = path.join(rootPath, "build")
const bundlePath = path.join(buildPath, "esm.js")
const gzipPath = path.join(rootPath, "esm.js.gz")

const uglifyPluginPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uglifyPluginPath, "node_modules/uglify-es")

const acornPkg = require("acorn/package.json")
const acornPath = path.join(vendorPath, "acorn")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const punycodePkgPath = path.dirname(require.resolve("punycode/package.json"))
const punycodePath = path.join(vendorPath, "punycode")

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
      /* eslint consistent-return: off, import/no-extraneous-dependencies: off */
      const gzip = pify(require("node-zopfli").gzip)
      return fs.readFile(bundlePath)
        .then((buffer) => gzip(buffer, { numiterations: 100 }))
        .then((buffer) => fs.writeFile(gzipPath, buffer))
    }
  })
