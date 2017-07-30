import FastObject from "../fast-object.js"

import createOptions from "../util/create-options.js"
import keys from "../util/keys.js"
import mkdirp from "./mkdirp.js"
import path from "path"
import writeFile from "./write-file.js"

let pendingWriteTimer = null
const pendingWrites = new FastObject

function writeFileDefer(filePath, content, options, callback) {
  options = createOptions(options)
  pendingWrites[filePath] = { callback, content, options }

  if (pendingWriteTimer !== null) {
    return
  }
  pendingWriteTimer = setImmediate(() => {
    pendingWriteTimer = null
    keys(pendingWrites).forEach((filePath) => {
      const pending = pendingWrites[filePath]
      const callback = pending.callback
      const options = pending.options
      let success = false

      if (mkdirp(path.dirname(filePath), options.scopePath)) {
        const content = typeof pending.content === "function"
          ? pending.content()
          : pending.content

        success = writeFile(filePath, content, options)
      }

      if (success) {
        delete pendingWrites[filePath]
      }

      if (typeof callback === "function") {
        callback(success)
      }
    })
  })
}

export default writeFileDefer
