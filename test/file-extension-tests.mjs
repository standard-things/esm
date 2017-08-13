import assert from "assert"
import fs from "fs"
import path from "path"
import zlib from "zlib"

const content = fs.readFileSync("./file-extension/a.mjs")
const gzipped = zlib.gzipSync(content)

describe("file extension", () =>
  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((ext) => {
    const abcNs = { a: "a", b: "b", c: "c" }
    const modulePath = "./file-extension/a" + ext

    if (ext.endsWith(".gz") && ! fs.existsSync(modulePath)) {
      fs.writeFileSync(modulePath, gzipped)
    }

    it(`compiles ${ext} files`, () =>
      import(modulePath)
        .then((ns) => assert.deepEqual(ns, abcNs))
        .catch((e) => assert.ifError(e))
    )
  })
)
