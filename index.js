/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const gunzipSync = require("zlib").gunzipSync
const join = require("path").join
const readFileSync = require("fs").readFileSync
const runInThisContext = require("vm").runInThisContext

const filePath = join(__dirname, "esm.js.gz")

const content =
  "(function(require,module,__filename){" +
  gunzipSync(readFileSync(filePath)).toString() +
  "\n})"

const compiledWrapper = runInThisContext(content, {
  displayErrors: true,
  filename: filePath,
  lineOffset: 0
})

compiledWrapper(require, module, module.filename)
