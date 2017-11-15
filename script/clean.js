/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")
const trash = require("./trash.js")

const rootPath = path.resolve(__dirname, "..")
const gitignorePath = path.resolve(rootPath, ".gitignore")
const nodeModulesPath = path.resolve(rootPath, "node_modules")

const ignorePatterns = fs.readFileSync(gitignorePath, "utf8")
  .replace(/^\s+/gm, "")
  .replace(/\s+$/gm, "")
  .split("\n")
  .map((ignore) => ignore.startsWith("/")
    ? ignore.slice(1)
    : "**/" + ignore
  )

const ignorePaths = globby.sync(ignorePatterns, {
  cwd: rootPath,
  realpath: true
})

const trashPaths = ignorePaths
  .filter((thePath) => thePath !== nodeModulesPath)

function isEmpty(dirPath) {
  return ! fs.readdirSync(dirPath).length
}

function trashEmptyDirs() {
  return globby.sync(["*/**/"], {
    cwd: rootPath,
    realpath: true
  })
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
