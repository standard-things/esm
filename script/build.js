"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
const setupAcorn = require("./setup-acorn.js")
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

const trashPaths = [
  buildPath,
  loaderPath
]

const webpackArgs = [
  argv.prod && ! argv.test
    ? "--display-optimization-bailout"
    : "--hide-modules"
]

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function copyBundle() {
  const srcPath = path.resolve(buildPath, "esm.js")

  return fs.existsSync(srcPath)
    ? fs.copy(srcPath, loaderPath)
    : Promise.resolve()
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
    setupAcorn()
  ])
  .then(makeBundle)
  .then(copyBundle)
  .catch(console.error)
