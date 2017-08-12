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
const jsonPath = path.join(rootPath, "package.json")
const vendorPath = path.join(rootPath, "src/vendor")

const acornPath = path.join(vendorPath, "acorn")
const acornPkg = require("acorn/package.json")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const punycodePath = path.join(vendorPath, "punycode")
const punycodePkgPath = path.dirname(require.resolve("punycode/package.json"))

const uglifyPluginPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uglifyPluginPath, "node_modules/uglify-es")

const extractFilterRegExp = /^(?:pack|src).*?\.(?:js|json)$/
const removeDepsRegExp = /,\s*"dependencies":[^]*?\}/

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

function cleanJSON() {
  // Remove dependencies field, added by npm@5, from package.json.
  return fs
    .readFile(jsonPath, "utf8")
    .then((jsonText) => fs.writeFile(jsonPath, jsonText.replace(removeDepsRegExp, "")))
}

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

function getPunycode() {
  if (fs.pathExistsSync(punycodePath)) {
    return Promise.resolve()
  }

  return fs.copy(punycodePkgPath, punycodePath)
}

function gzipBundle() {
  /* eslint import/no-extraneous-dependencies: off */
  const gzip = pify(require("node-zopfli").gzip)

  return fs
    .readFile(bundlePath)
    .then((buffer) => gzip(buffer, { numiterations: 100 }))
    .then((buffer) => fs.writeFile(gzipPath, buffer))
}

function makeBundle() {
  return execa("webpack", webpackArgs, {
    cwd: rootPath,
    env: { NODE_ENV },
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

Promise.all([
  cleanRepo(),
  getAcorn(),
  getPunycode()
])
.then(makeBundle)
.then(() => argv.prod && Promise.all([
  cleanJSON(),
  gzipBundle()
]))
