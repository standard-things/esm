import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"
import require from "../require.js"

const abcFilePath = require.resolve("./fixture/export/abc.mjs")
const defFilePath = require.resolve("./fixture/export/def.js")

export default () => {
  const esmRequire = makeRequire(module)

  const abcExpected = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const defExpected = {
    d: "d",
    e: "e",
    f: "f"
  }

  delete esmRequire.cache[abcFilePath]
  delete esmRequire.cache[defFilePath]

  const abcExported = esmRequire("./fixture/export/abc.mjs")
  const defExported = esmRequire("./fixture/export/def.js")
  const defModule = esmRequire.cache[defFilePath]

  assert.deepStrictEqual(abcExported, abcExpected)
  assert.deepStrictEqual(defExported, defExpected)

  assert.ok(defModule)
  assert.strictEqual(defModule.id, defFilePath)
}
