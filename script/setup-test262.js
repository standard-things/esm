"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")
const trash = require("./trash.js")

const rootPath = path.resolve(__dirname, "..")
const test262Path = path.resolve(rootPath, "test/vendor/test262")
const repoPath = path.resolve(test262Path, ".repo")

const testDirs = [
  "test/language/export",
  "test/language/import",
  "test/language/module-code",
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

  return trash(repoPath)
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
      testDirs
        .reduce((promise, testDir) => {
          const repoDirPath = path.resolve(repoPath, testDir)
          const testDirPath = path.resolve(test262Path, testDir)

          return promise
            .then(() => trash(testDirPath))
            .then(() => fs.move(repoDirPath, testDirPath))
        }, Promise.resolve())
    )
    .then(() => trash(repoPath))
}

module.exports = setupTest262
