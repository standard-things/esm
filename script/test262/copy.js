"use strict"

const fs = require("fs-extra")
const path = require("path")

const rootPath = path.resolve(".")
const test262RepoPath = path.resolve(rootPath, "test/vendor/test262/.repo-clone")
const jsTestPath = path.resolve(rootPath, "test/vendor/test262/.js-tests")

const testDirs = [
  "test/language/export",
  "test/language/import",
  "test/language/module-code",
  "test/language/module-code/dynamic-import",
  "harness"
]

function copyTests() {
  fs.removeSync(jsTestPath)

  for (const testDir of testDirs) {
    fs.copySync(
      path.resolve(test262RepoPath, testDir),
      path.resolve(jsTestPath, testDir)
    )
  }
}

module.exports = copyTests
