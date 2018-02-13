"use strict"

const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const gitignorePath = path.resolve(rootPath, ".gitignore")

const patterns = fs.readFileSync(gitignorePath, "utf8")
  .replace(/^\s+/gm, "")
  .replace(/\s+$/gm, "")
  .split("\n")
  .map((ignore) => ignore.startsWith("/")
    ? ignore.slice(1)
    : "**/" + ignore
  )

module.exports = globby.sync(patterns, {
  absolute: true,
  cwd: rootPath,
  expandDirectories: false,
  onlyFiles: false
})
