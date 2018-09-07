"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const test262Path = path.resolve(rootPath, "test/vendor/test262")

const repoDir = ".repo"
const repoPath = path.resolve(test262Path, repoDir)

const testDirs = [
  "test/language/export",
  "test/language/import",
  "test/language/module-code",
  "test/language/module-code/dynamic-import",
  "harness"
]

function git(cwd, args) {
  return execa("git", args, {
    cwd,
    reject: false
  })
}

function setupTest262() {
  if (fs.existsSync(test262Path)) {
    return Promise.resolve()
  }

  fs.removeSync(repoPath)

  return git(rootPath, ["--version"])
    .then(() =>
      git(rootPath, [
        "clone",
        "--depth",
        "1",
        "https://github.com/tc39/test262.git",
        repoPath
      ])
    )
    .then(() =>
      git(repoPath, [
        "fetch",
        "origin",
        "--depth",
        "1",
        "pull/1588/head:dynamic-import"
      ])
    )
    .then(() =>
      git(repoPath, [
        "checkout",
        "dynamic-import"
      ])
    )
    .then(() => {
      for (const testDir of testDirs) {
        const repoDirPath = path.resolve(repoPath, testDir)
        const testDirPath = path.resolve(test262Path, testDir)

        fs.removeSync(testDirPath)
        fs.copySync(repoDirPath, testDirPath)
      }

      fs.removeSync(repoPath)
    })
}

module.exports = setupTest262
