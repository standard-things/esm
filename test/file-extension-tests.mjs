import assert from "assert"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import zlib from "zlib"

const jsGzipped = zlib.gzipSync(fs.readFileSync("./fixture/file-extension/a.js"))
const mjsGzipped = zlib.gzipSync(fs.readFileSync("./fixture/file-extension/a.mjs"))
const exts = [".gz", ".js.gz", ".mjs.gz", ".mjs"]

exts.forEach((ext) => {
  const modulePath = "./fixture/file-extension/a" + ext

  if (ext.endsWith(".gz") &&
      ! fs.pathExistsSync(modulePath)) {
    const gzipped = ext === ".mjs.gz" ? mjsGzipped : jsGzipped
    fs.writeFileSync(modulePath, gzipped)
  }
})

describe("file extension", () => {
  it("should support loading `.gz` files in CJS", () =>
    import("./file-extension/gz.js")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support loading `.gz` files in ESM", () =>
    import("./file-extension/gz.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should not support loading `.mjz.gz` with `require`", () =>
    import("./file-extension/mjs.gz.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )
})
