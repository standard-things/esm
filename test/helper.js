"use strict"

const globby = require("globby")
const { satisfies } = require("semver")

let babelFiles
let babelRegister

if (satisfies(process.version, "<6")) {
  babelRegister = require("babel-register")
  babelFiles = globby.sync([
    "**/*.{js,mjs}",
    "!**/node_modules/**/*"
  ], {
    realpath: true
  })
}

const register = {
  init() {
    if (babelRegister) {
      babelRegister({
        cache: false,
        only: (absPath) => babelFiles.indexOf(absPath) > -1
      })
    }
  }
}

module.exports = {
  __dirname,
  register,
  require
}
