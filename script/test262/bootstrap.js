"use strict"

const { resolve } = require("path")
const clone = require("./clone.js")
const copy = require("./copy.js")
const renameFileExtension = require("./file-extension.js")

const rootPath = resolve(".")

function bootstrap() {
  return (
    clone()
      .then(copy)
      // TODO remove:
      // temporary measure and can be safily removed once
      // the `dynamic import` test PR is merged into test262
      // -- BEGIN
      .then(clone.dynamicImport)
      .then(copy.dynamicImport)
      // -- END
  )
}

module.exports = bootstrap
