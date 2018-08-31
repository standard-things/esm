"use strict"

const { resolve } = require("path")
const execa = require("execa")
const { removeSync } = require("fs-extra")

const rootPath = resolve(".")
const test262Path = resolve(rootPath, "test/vendor/test262")
const test262RepoPath = resolve(test262Path, ".repo-clone")
// const test262RepoGitPath = resolve(test262RepoPath, ".git")

function run(cwd, file, args) {
  return execa(file, args, {
    cwd,
    reject: false
  })
}

function clone() {
  removeSync(test262RepoPath)

  return run(test262Path, "git", ["--version"]).then(() =>
    run(test262Path, "git", [
      "clone",
      "--depth",
      "1",
      "https://github.com/tc39/test262.git",
      ".repo-clone"
    ])
  )
}

// TODO remove:
// this is just a temporary measure and can be safily removed once
// the `dynamic import` test PR is merged into test262
// -- BEGIN
clone.dynamicImport = function () {
  return run(test262RepoPath, "git", [
    "fetch",
    "origin",
    "--depth",
    "1",
    "pull/1588/head:dynamic-import"
  ]).then(() => run(test262RepoPath, "git", ["checkout", "dynamic-import"]))
  // .then(() =>
  //   trash(test262RepoGitPath)
  // )
  // -- END
}

module.exports = clone
