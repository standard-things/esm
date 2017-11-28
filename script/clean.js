/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
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

function exists(thePath) {
  return fs.existsSync(thePath)
}

function isEmpty(dirPath) {
  return ! fs.readdirSync(dirPath).length
}

function realPath(thePath) {
  return path.resolve(rootPath, thePath)
}

function trashEmptyDirs() {
  return globby.sync(["*/**/"], {
    cwd: rootPath,
    expandDirectories: false,
    nodir: false
  })
  .map(realPath)
  .filter(exists)
  .filter(isEmpty)
  .map(trash)
}

function trashNodeModules() {
  return trash(nodeModulesPath)
}

Promise
  .all(trashPaths.map(trash))
  .then(trashEmptyDirs())
  .then(trashNodeModules())
