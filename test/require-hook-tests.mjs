import __dirname from "./__dirname.js"
import assert from "assert"
import fs from "fs-extra"
import makeRequire from "../index.js"
import module from "./module.js"
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
  it("should create a require function that can load ESM", () => {
    const esmRequire = makeRequire(module)
    const exported = esmRequire(abcId)
    assert.deepEqual(exported, abcNs)
  })

  it("should support options", () => {
    const cjsId = path.resolve(__dirname, "./import/cjs/id")
    const cjsMod = new module.constructor(cjsId)
    cjsMod.filename = cjsMod.id

    const allRequire = makeRequire(module, { esm: "all" })
    const cjsRequire = makeRequire(cjsMod, true)
    const gzRequire = makeRequire(module, { gz: true })
    const jsRequire = makeRequire(module, { esm: "js" })
    const mjsRequire = makeRequire(module, { esm: "mjs" })

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
})
