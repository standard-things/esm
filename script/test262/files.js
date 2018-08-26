"use strict"

const globby = require("globby")
const { resolve } = require("path")

const testPath = resolve(__dirname, "../../test/vendor/test262/.test")

exports.getTestFiles = function getTestFiles() {
  return globby(
    [
      "test/language/export/**/*.js",
      "test/language/import/**/*.js",
      "test/language/module-code/**/*.js"
    ],
    {
      absolute: true,
      cwd: testPath
    }
  )
}

exports.getHarnessFiles = function getHarnessFiles() {
  return globby(["harness/*.js"], {
    absolute: true,
    cwd: testPath
  })
}
