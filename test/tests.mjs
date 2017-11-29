import "./import-tests.mjs"
import "./dynamic-import-tests.mjs"
import "./export-tests.mjs"
import "./setter-tests.mjs"
import "./misc-tests.mjs"
import "./compiler-tests.mjs"
import "./output-tests.mjs"
import "./file-extension-tests.mjs"
import "./url-tests.mjs"
import "./cli-hook-tests.mjs"
import "./main-hook-tests.mjs"
import "./require-hook-tests.mjs"
import "./repl-hook-tests.mjs"
import "./scenario-tests.mjs"

import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import zlib from "zlib"

const jsonExt = require.extensions[".json"]

function gzip(fromPath, toPath) {
  return fs.outputFileSync(toPath, zlib.gzipSync(fs.readFileSync(fromPath)))
}

gzip("./fixture/file-extension/a.js", "./fixture/file-extension/a.gz")
gzip("./fixture/file-extension/a.js", "./fixture/file-extension/a.js.gz")
gzip("./fixture/file-extension/a.mjs", "./fixture/file-extension/a.mjs.gz")
gzip("./fixture/options/mjs/index.mjs", "./fixture/options/gz/index.mjs.gz")
gzip("./fixture/options-file/esmrc-js-object/.esmrc.js", "./fixture/options-file/esmrc-gz-object/.esmrc.gz")
gzip("./fixture/options-file/esmrc-js-string-cjs/.esmrc.js", "./fixture/options-file/esmrc-gz-string-cjs/.esmrc.gz")
gzip("./fixture/options-file/esmrc-js-string-js/.esmrc.js", "./fixture/options-file/esmrc-gz-string-js/.esmrc.gz")
gzip("./fixture/options-file/esmrc-js-object/.esmrc.js", "./fixture/options-file/esmrc-js-gz-object/.esmrc.js.gz")
gzip("./fixture/options-file/esmrc-js-string-cjs/.esmrc.js", "./fixture/options-file/esmrc-js-gz-string-cjs/.esmrc.js.gz")
gzip("./fixture/options-file/esmrc-js-string-js/.esmrc.js", "./fixture/options-file/esmrc-js-gz-string-js/.esmrc.js.gz")
gzip("./fixture/options-file/esmrc-mjs-object/.esmrc.mjs", "./fixture/options-file/esmrc-mjs-gz-object/.esmrc.mjs.gz")
gzip("./fixture/options-file/esmrc-mjs-string-cjs/.esmrc.mjs", "./fixture/options-file/esmrc-mjs-gz-string-cjs/.esmrc.mjs.gz")
gzip("./fixture/options-file/esmrc-mjs-string-js/.esmrc.mjs", "./fixture/options-file/esmrc-mjs-gz-string-js/.esmrc.mjs.gz")

beforeEach(() => {
  delete global.customError
  delete global.evaluated
  delete global.loadCount
  delete global.this
  delete require.extensions[".coffee"]
  require.extensions[".json"] = jsonExt
})
