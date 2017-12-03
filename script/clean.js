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
  return globby.sync(["*/**/"], {
    cwd: rootPath,
    expandDirectories: false,
    nodir: false
  })
  .map(realPath)
  .filter(fs.existsSync)
  .filter(isEmpty)
  .map(trash)
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

function realPath(thePath) {
  return path.resolve(rootPath, thePath)
}

Promise
  .resolve()
  .then(cleanRepo)
  .then(cleanEmptyDirs)
  .then(cleanNodeModules)
