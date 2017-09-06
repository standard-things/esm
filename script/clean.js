/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")
const trash = require("./trash.js")

const rootPath = path.join(__dirname, "..")
const gitignorePath = path.join(rootPath, ".gitignore")

const ignores = fs.readFileSync(gitignorePath, "utf8")
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
