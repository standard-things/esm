import assert from "assert"
import fs from "fs-extra"
import makeRequire from "../index.js"
import path from "path"
import zlib from "zlib"

const abcId = "./fixture/export/abc.mjs"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

if (! fs.pathExistsSync("./require/a.mjs.gz")) {
  const content = fs.readFileSync("./require/a.js")
  const gzipped = zlib.gzipSync(content)
  fs.writeFileSync("./require/a.mjs.gz", gzipped)
}

beforeEach(() => {
  delete global.this
})

describe("require hook", () => {
  it("should create a require function that can load ESM", () =>
    import("./module.js")
      .then((ns) => {
        const mod = ns.default
        const esmRequire = makeRequire(mod)
        const exported = esmRequire(abcId)
        assert.deepEqual(exported, abcNs)
      })
  )

  it("should support options", () =>
    import("./module.js")
      .then((ns) => {
        const mod = ns.default
        const cjsId = path.resolve("./import/cjs/id")
        const cjsMod = new mod.constructor(cjsId)
        cjsMod.filename = cjsMod.id

        const allRequire = makeRequire(mod, { esm: "all" })
        const cjsRequire = makeRequire(cjsMod, true)
        const gzRequire = makeRequire(mod, { gz: true })
        const jsRequire = makeRequire(mod, { esm: "js" })
        const mjsRequire = makeRequire(mod, { esm: "mjs" })

        allRequire("./require/this.js")
        assert.strictEqual(global.this, "undefined")

        let exported = cjsRequire("./cjs")
        exported.check()

        exported = gzRequire("./require/a.mjs.gz")
        assert.deepEqual(exported, abcNs)

        exported = jsRequire("./require/a.js")
        assert.deepEqual(exported, abcNs)

        exported = mjsRequire(abcId)
        assert.deepEqual(exported, abcNs)
      })
  )
})
