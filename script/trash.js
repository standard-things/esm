"use strict"

const fs = require("fs-extra")
const path = require("path")

const options = {
  glob: false
}

let _trash

function trash(iterable) {
  return new Promise((resolvePromise) => {
    const paths = Array
      .from(
        typeof iterable === "string"
          ? [iterable]
          : iterable
      )
      .map((thePath) => path.resolve(String(thePath)))
      .filter(fs.existsSync)

    const _emit = process.emit

    process.emit = function (...args) {
      const [name] = args

      if (name !== "warning") {
        return Reflect.apply(_emit, this, args)
      }
    }

    process.noDeprecation = true

    return Promise
      .all(paths.map((thePath) => {
        if (_trash === void 0) {
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
        process.emit = _emit
        Reflect.deleteProperty(process, "noDeprecation")
        resolvePromise()
      })
  })
}

module.exports = trash
