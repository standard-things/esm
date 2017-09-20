import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import makeRequire from "../index.js"
import module from "./module.js"
import path from "path"
import zlib from "zlib"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const abcId = "./fixture/export/abc.mjs"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

if (! fs.pathExistsSync("./fixture/options/gz/index.mjs.gz")) {
  const content = fs.readFileSync("./fixture/options/js/index.js")
  const gzipped = zlib.gzipSync(content)
  fs.writeFileSync("./fixture/options/gz/index.mjs.gz", gzipped)
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

  it("should support options", (done) => {
    const trueId = path.resolve(__dirname, "./fixture/options/true/id")
    const trueMod = new module.constructor(trueId, null)
    trueMod.filename = trueMod.id

    const trueRequire = makeRequire(trueMod, true)
    const allRequire = makeRequire(module, { esm: "all" })
    const cjsRequire = makeRequire(module, { cjs: true })
    const gzRequire = makeRequire(module, { gz: true })
    const jsRequire = makeRequire(module, { esm: "js" })
    const mjsRequire = makeRequire(module, { esm: "mjs" })

    allRequire("./fixture/options/all/")
    assert.ok("this" in global)
    assert.strictEqual(global.this, "undefined")

    const dirPath = path.resolve(__dirname, "./fixture/options/cjs")
    const exported = cjsRequire(dirPath + "/")
    assert.deepEqual(exported, { __dirname: dirPath })

    const exports = [
      gzRequire("./fixture/options/gz/index.mjs.gz"),
      jsRequire("./fixture/options/js/"),
      mjsRequire("./fixture/options/mjs/"),
      trueRequire("../js/")
    ]

    exports.forEach((exported) => assert.ok(exported))

    setImmediate(() => {
      const cachePaths = globby.sync(["./fixture/options/**/.esm-cache"])
      assert.deepEqual(cachePaths, ["./fixture/options/true/.esm-cache"])
      done()
    })
  })
})
