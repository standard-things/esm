"use strict"

const { resolve } = require("path")
const { copySync, removeSync } = require("fs-extra")

const rootPath = resolve(".")
const test262RepoPath = resolve(rootPath, "test/vendor/test262/.repo-clone")
const jsTestPath = resolve(rootPath, "test/vendor/test262/.js-tests")

const testDirs = [
  "test/language/export",
  "test/language/import",
  "test/language/module-code",
  "harness"
]

function copyTests() {
  removeSync(jsTestPath)

  testDirs.map((testDir) => {
    copySync(resolve(test262RepoPath, testDir), resolve(jsTestPath, testDir))
  })
}

// TODO remove:
// temporary measure and can be safily removed once
// the `dynamic import` test PR is merged into test262
// -- BEGIN
const testDirsDynamicImport = ["test/language/module-code/dynamic-import"]

copyTests.dynamicImport = function () {
  testDirsDynamicImport.map((testDirDynamicImport) => {
    copySync(
      resolve(test262RepoPath, testDirDynamicImport),
      resolve(jsTestPath, testDirDynamicImport)
    )
  })
}
// -- END

module.exports = copyTests
