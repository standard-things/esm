"use strict"

const download = require("download")
const fs = require("fs-extra")
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const vendorPath = path.resolve(rootPath, "src/vendor")

const acornPath = path.resolve(vendorPath, "acorn")
const acornPkg = require("acorn/package.json")
const acornURL = "https://github.com/ternjs/acorn/archive/" + acornPkg.version + ".zip"

const extractFilterRegExp = /^acorn[\\/].*?\.(?:js|json)$/

function setupAcorn() {
  if (fs.existsSync(acornPath)) {
    return Promise.resolve()
  }

  return download(acornURL, acornPath, {
    extract: true,
    filter: (file) => extractFilterRegExp.test(file.path),
    strip: 1
  })
}

module.exports = setupAcorn
