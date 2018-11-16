"use strict"

const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const gitignorePath = path.resolve(rootPath, ".gitignore")

const patterns = fs.readFileSync(gitignorePath, "utf8")
  .split(/\r?\n/)
  .map((sourceLine) => {
    sourceLine = sourceLine.trim()

    if (sourceLine !== "") {
      return sourceLine.startsWith("/")
        ? sourceLine.slice(1)
        : "**/" + sourceLine
    }

    return sourceLine
  })
  .filter(Boolean)

module.exports = globby.sync(patterns, {
  absolute: true,
  cwd: rootPath,
  dot: true,
  expandDirectories: false,
  onlyFiles: false,
  transform: path.normalize
})
