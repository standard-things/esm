"use strict"

const execa = require("execa")
const fs = require("fs")
const path = require("path")
const pify = require("pify")
const read = pify(fs.readFile)
const write = pify(fs.writeFile)
const trash = require("trash")
const argv = require("yargs")
  .boolean("prod")
  .argv

const NODE_ENV = argv.prod ? "production" : "development"
const rootPath = path.join(__dirname, "..")
const bundlePath = path.join(__dirname, "../build/esm.js")
const outputPath = path.join(__dirname, "../esm.js.gz")
const uwpPath = path.join(require.resolve("uglifyjs-webpack-plugin"), "../../")
const uglifyPath = path.join(uwpPath, "node_modules/uglify-js")

trash(uglifyPath)
  .then(() => execa("webpack", [], {
    cwd: rootPath,
    env: { NODE_ENV },
    stdio: "inherit"
  }))
  .then(() => read(bundlePath))
  .then((buffer) => {
    if (argv.prod) {
      const gzip = pify(require("node-zopfli").gzip)
      return gzip(buffer)
    }
    return buffer
  })
  .then((buffer) => write(outputPath, buffer))
