"use strict"

const fs = require("fs-extra")
const path = require("path")

const options = {
  __proto__: null,
  glob: false
}

let _trash

function trash(iterable) {
  return new Promise((resolve) => {
    const paths = Array
      .from(typeof iterable === "string" ? [iterable] : iterable)
      .map((thePath) => path.resolve(String(thePath)))
      .filter(fs.pathExistsSync)

    process.noDeprecation = true
    return Promise
      .all(paths.map((thePath) => {
        if (! _trash) {
          _trash = require("trash")
        }

        return _trash([thePath], options)
          .catch((e) => {
            if (e &&
                e.code === "EACCES") {
              process.exitCode = e.code
            }
          })
      }))
      .then(() => {
        Reflect.deleteProperty(process, "noDeprecation")
        resolve()
      })
  })
}

module.exports = trash
