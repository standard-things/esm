import assert from "assert"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import zlib from "zlib"

const content = fs.readFileSync("./fixture/file-extension/a.mjs")
const gzipped = zlib.gzipSync(content)
const exts = [".gz", ".js.gz", ".mjs.gz", ".mjs"]

exts.forEach((ext) => {
  const modulePath = "./fixture/file-extension/a" + ext

  if (ext.endsWith(".gz") &&
      ! fs.pathExistsSync(modulePath)) {
    fs.writeFileSync(modulePath, gzipped)
  }
})

describe("file extension", () => {
  it("should support loading `.gz` files in CJS", () =>
    import("./file-extension/load.js")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support loading `.gz` files in ESM", () =>
    import("./file-extension/load.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )
})
