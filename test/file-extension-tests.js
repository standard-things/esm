import __dirname from "./__dirname.js"
import assert from "assert"
import fs from "fs"
import path from "path"
import zlib from "zlib"

const fixturePath = path.join(__dirname, "file-extension")
const content = fs.readFileSync(path.join(fixturePath, "a.mjs"))
const gzipped = zlib.gzipSync(content)

describe("file extension", () =>
  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((extname) => {
    const abcNs = { a: "a", b: "b", c: "c" }
    const modulePath = path.join(fixturePath, "a" + extname)

    if (extname.endsWith(".gz") && ! fs.existsSync(modulePath)) {
      fs.writeFileSync(modulePath, gzipped)
    }

    it(`compiles ${extname} files`, () =>
      import(modulePath)
        .then((ns) => assert.deepEqual(ns, abcNs))
        .catch((e) => assert.ifError(e))
    )
  })
)
