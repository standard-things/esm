/* eslint strict: off */
"use strict"

const globby = require("globby")
const { join } = require("path")
const { readFileSync } = require("fs")
const trash = require("trash")

const rootPath = join(__dirname, "..")
const gitignorePath = join(rootPath, ".gitignore")

const ignores = readFileSync(gitignorePath, "utf8")
  .replace(/^\s+/gm, "")
  .replace(/\s+$/gm, "")
  .split("\n")
  .map((ignore) => ignore.startsWith("/")
    ? ignore.slice(1)
    : "**/" + ignore
  )

const trashPaths = globby.sync(ignores, {
  cwd: rootPath,
  realpath: true
})

Promise.all(trashPaths.map(trash))
