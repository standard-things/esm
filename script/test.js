"use strict"

const execa = require("execa")
const path = require("path")
const trash = require("trash")

const rootPath = path.join(__dirname, "..")
const testPath = path.join(rootPath, "test")

const cachePaths = [
  path.join(testPath, ".cache"),
  path.join(testPath, "node_modules/enabled/.esm-cache")
]

const execOptions = {
  cwd: testPath,
  stdio: "inherit"
}

const mochaArgs = [
  "--require", "../build/esm.js",
  "--full-trace",
  "tests.js"
]

function runTests() {
  return execa("mocha", mochaArgs, execOptions)
}

Promise
  // Clear cache folders for first run.
  .all(cachePaths.map(trash))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
