/* eslint strict: off */
"use strict"

const pify = require("pify")
const download = pify(require("download-git-repo"))
const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
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
const acornPath = path.join(vendorPath, "acorn")
const buildPath = path.join(rootPath, "build")
const bundlePath = path.join(buildPath, "esm.js")
const gzipPath = path.join(rootPath, "esm.js.gz")
const punycodePath = path.join(vendorPath, "punycode")
const uwpPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uwpPath, "node_modules/uglify-es")

const acornPkg = require("acorn/package.json")
const punycodePkgPath = path.dirname(require.resolve("punycode/package.json"))

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
  .then(() => fs.pathExists(acornPath))
  .then((exists) => {
    if (! exists) {
      return download("ternjs/acorn#" + acornPkg.version, acornPath)
    }
  })
  .then(() => fs.pathExists(punycodePath))
  .then((exists) => {
    if (! exists) {
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
