"use strict"

const execa = require("execa")
const fs = require("fs")
const path = require("path")
const pify = require("pify")
const read = pify(fs.readFile)
const trash = require("trash")
const write = pify(fs.writeFile)
const argv = require("yargs")
  .boolean("prod")
  .argv

const NODE_ENV = argv.prod ? "production" : "development"
const rootPath = path.join(__dirname, "..")
const buildPath = path.join(rootPath, "build")
const bundlePath = path.join(buildPath, "esm.js")
const gzipPath = path.join(rootPath, "esm.js.gz")
const uwpPath = path.join(rootPath, "node_modules/uglifyjs-webpack-plugin")
const uglifyPath = path.join(uwpPath, "node_modules/uglify-js")

const trashPaths = [
  buildPath,
  gzipPath,
  uglifyPath
]

Promise
  .all(trashPaths.map(trash))
  .then(() => execa("webpack", [], {
    cwd: rootPath,
    env: { NODE_ENV },
    stdio: "inherit"
  }))
  .then(() => {
    if (argv.prod) {
      const gzip = pify(require("node-zopfli").gzip)
      return read(bundlePath)
        .then(gzip)
        .then((buffer) => write(gzipPath, buffer))
    }
  })
