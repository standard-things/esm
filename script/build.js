/* eslint strict: off */
"use strict"

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
const uwpPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uwpPath, "node_modules/uglify-es")

const trashPaths = [
  buildPath,
  gzipPath,
  uglifyPath
]

const webpackArgs = []

if (argv.prod && ! argv.test) {
  webpackArgs.push("--display-optimization-bailout")
} else {
  webpackArgs.push("--hide-modules")
}

Promise
  .all(trashPaths.map(trash))
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
