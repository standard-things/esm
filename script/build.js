"use strict"

const download = require("download")
const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
const pify = require("pify")
const trash = require("./trash.js")

const argv = require("yargs")
  .boolean("prod")
  .boolean("test")
  .argv

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  (argv.test ? "-test" : "")

// eslint-disable-next-line import/no-extraneous-dependencies
const zlib = argv.prod ? require("@gfx/zopfli") : require("zlib")
const gzip = pify(zlib.gzip)
const gzipOptions = argv.prod ? { numiterations: 100 } : { level: 0 }

const rootPath = path.resolve(__dirname, "..")
const buildPath = path.resolve(rootPath, "build")
const bundlePath = path.resolve(buildPath, "esm.js")
const gzipPath = path.resolve(rootPath, "esm.js.gz")
const vendorPath = path.resolve(rootPath, "src/vendor")

const acornPath = path.resolve(vendorPath, "acorn")
const acornPkg = require("acorn/package.json")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const uglifyPluginPath = path.resolve(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.resolve(uglifyPluginPath, "node_modules/uglify-es")

const extractFilterRegExp = /^(?:pack|src).*?\.(?:js|json)$/

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

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function getAcorn() {
  if (fs.pathExistsSync(acornPath)) {
    return Promise.resolve()
  }

  return download(acornURL, acornPath, {
    extract: true,
    filter: (file) => extractFilterRegExp.test(file.path),
    strip: 1
  })
}

function gzipBundle() {
  if (! fs.pathExistsSync(bundlePath)) {
    return Promise.resolve()
  }

  return fs
    .readFile(bundlePath)
    .then((buffer) => gzip(buffer, gzipOptions))
    .then((buffer) => fs.outputFile(gzipPath, buffer))
}

function makeBundle() {
  return execa("webpack", webpackArgs, {
    cwd: rootPath,
    env: { NODE_ENV },
    reject: false,
    stdio: "inherit"
  })
}

Promise
  .all([
    cleanRepo(),
    getAcorn()
  ])
  .then(makeBundle)
  .then(gzipBundle)
