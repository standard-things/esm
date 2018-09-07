"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")

const test262Path = path.resolve("test/vendor/test262")
const test262RepoPath = path.resolve(test262Path, ".repo-clone")

function run(cwd, file, args) {
  return execa(file, args, {
    cwd,
    reject: false
  })
}

function clone() {
  fs.removeSync(test262RepoPath)

  return run(test262Path, "git", ["--version"])
    .then(() =>
      run(test262Path, "git", [
        "clone",
        "--depth",
        "1",
        "https://github.com/tc39/test262.git",
        ".repo-clone"
      ])
    )
    .then(() =>
      run(test262RepoPath, "git", [
        "fetch",
        "origin",
        "--depth",
        "1",
        "pull/1588/head:dynamic-import"
      ])
    )
    .then(() =>
      run(test262RepoPath, "git", [
        "checkout",
        "dynamic-import"
      ])
    )
}

module.exports = clone
