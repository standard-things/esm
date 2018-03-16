"use strict"

const fs = require("fs-extra")
const globby = require("globby")
const ignorePaths = require("./ignore-paths.js")
const path = require("path")
const trash = require("./trash.js")

const rootPath = path.resolve(__dirname, "..")
const nodeModulesPath = path.resolve(rootPath, "node_modules")

const trashPaths = ignorePaths
  .filter((thePath) => thePath !== nodeModulesPath)

function cleanEmptyDirs() {
  return Promise
    .all(
      globby.sync(["*/**/"], {
        absolute: true,
        cwd: rootPath,
        expandDirectories: false,
        onlyDirectories: true
      })
      .filter(isEmpty)
      .map(trash)
    )
}

function cleanNodeModules() {
  return trash(nodeModulesPath)
}

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function isEmpty(dirPath) {
  return ! fs.readdirSync(dirPath).length
}

Promise
  .resolve()
  .then(cleanRepo)
  .then(cleanEmptyDirs)
  .then(cleanNodeModules)
