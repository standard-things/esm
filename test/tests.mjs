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
import require from "./require.js"
import zlib from "zlib"

const exts = [".gz", ".js.gz", ".mjs.gz", ".mjs"]
const jsonExt = require.extensions[".json"]

const jsGzipped = zlib.gzipSync(fs.readFileSync("./fixture/file-extension/a.js"))
const mjsGzipped = zlib.gzipSync(fs.readFileSync("./fixture/file-extension/a.mjs"))

exts.forEach((ext) => {
  const filePath = "./fixture/file-extension/a" + ext

  if (ext.endsWith(".gz") &&
      ! fs.pathExistsSync(filePath)) {
    const gzipped = ext === ".mjs.gz" ? mjsGzipped : jsGzipped
    fs.outputFileSync(filePath, gzipped)
  }
})

if (! fs.pathExistsSync("./fixture/options/gz/index.mjs.gz")) {
  const gzipped = zlib.gzipSync(fs.readFileSync("./fixture/options/js/index.js"))
  fs.outputFileSync("./fixture/options/gz/index.mjs.gz", gzipped)
}

beforeEach(() => {
  delete global.customError
  delete global.evaluated
  delete global.loadCount
  delete global.this
  delete require.extensions[".coffee"]
  require.extensions[".json"] = jsonExt
})
