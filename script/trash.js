"use strict"

const _trash = require("trash")
const fs = require("fs-extra")
const path = require("path")

const options = { glob: false }

function trash(iterable) {
  return new Promise((resolve) => {
    const paths = Array
      .from(typeof iterable === "string" ? [iterable] : iterable)
      .map((thePath) => path.resolve(String(thePath)))
      .filter(fs.pathExistsSync)

    return Promise
      .all(paths.map((thePath) =>
        _trash([thePath], options)
          .catch((e) => {
            if (e.code === "EACCES") {
              process.exitCode = e.code
            }
          })
      ))
      .then(resolve)
  })
}

module.exports = trash
