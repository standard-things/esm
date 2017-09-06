import assert from "assert"
import fs from "fs-extra"
import path from "path"
import requireHook from "../index.js"
import zlib from "zlib"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

if (! fs.pathExistsSync("./require/a.js.gz")) {
  const content = fs.readFileSync("./require/a.js")
  const gzipped = zlib.gzipSync(content)
  fs.writeFileSync("./require/a.js.gz", gzipped)
}

describe("require hook", () => {
  it("should create a require function that can load ESM", () =>
    import("./module.js")
      .then((ns) => {
        const mod = ns.default
        const esmRequire = requireHook(mod)
        const exported = esmRequire("./fixture/export/abc.mjs")
        assert.deepEqual(exported, abcNs)
      })
  )

  it("should support options", () =>
    import("./module.js")
      .then((ns) => {
        const mod = ns.default
        const esmRequire = requireHook(mod, { esm: "js" })
        const gzRequire = requireHook(mod, { gz: true })

        let exported = esmRequire("./require/a.js")
        assert.deepEqual(exported, abcNs)

        exported = gzRequire("./require/a.js.gz")
        assert.deepEqual(exported, abcNs)
      })
  )
})
