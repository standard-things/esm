import assert from "assert"
import fs from "fs"
import helper from "./helper.js"
import path from "path"
import zlib from "zlib"

const __dirname = helper.__dirname
const fixturePath = path.join(__dirname, "file-extension")

const content = fs.readFileSync(path.join(fixturePath, "a.mjs"))
const gzipped = zlib.gzipSync(content)

describe("file extension", () =>
  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((ext) => {
    const abcNs = { a: "a", b: "b", c: "c" }
    const modulePath = path.join(fixturePath, "a" + ext)

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
