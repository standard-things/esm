"use strict"

const download = require("download")
const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
const trash = require("./trash.js")

const argv = require("yargs")
  .boolean("prod")
  .boolean("test")
  .argv

const NODE_ENV = argv.prod ? "production" : "development"
const ESM_ENV = NODE_ENV + (argv.test ? "-test" : "")

const rootPath = path.resolve(__dirname, "..")
const buildPath = path.resolve(rootPath, "build")
const loaderPath = path.resolve(rootPath, "esm/loader.js")
const vendorPath = path.resolve(rootPath, "src/vendor")

const acornPath = path.resolve(vendorPath, "acorn")
const acornPkg = require("acorn/package.json")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const uglifyPluginPath = path.resolve(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.resolve(uglifyPluginPath, "node_modules/uglify-es")

const extractFilterRegExp = /^(?:pack|src).*?\.(?:js|json)$/

const trashPaths = [
  buildPath,
  loaderPath,
  uglifyPath
]

const webpackArgs = [
  "-r",
  "esm",
  argv.prod && ! argv.test
    ? "--display-optimization-bailout"
    : "--hide-modules"
]

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function copyBundle() {
  const srcPath = path.resolve(buildPath, "esm.js")

  return fs.pathExistsSync(srcPath)
    ? fs.copy(srcPath, loaderPath)
    : Promise.resolve()
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

function makeBundle() {
  return execa("webpack", webpackArgs, {
    cwd: rootPath,
    env: {
      ESM_ENV,
      NODE_ENV
    },
    stdio: "inherit"
  })
}

Promise
  .all([
    cleanRepo(),
    getAcorn()
  ])
  .then(makeBundle)
  .then(copyBundle)
  .catch(console.error)
