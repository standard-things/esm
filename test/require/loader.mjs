import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"
import require from "../require.js"

const abcId = require.resolve("./fixture/export/abc.mjs")
const defId = require.resolve("./fixture/export/def.js")
const nopId = require.resolve("nop")

export default () => {
  const esmRequire = makeRequire(module)

  delete esmRequire.cache[abcId]
  delete esmRequire.cache[defId]
  delete esmRequire.cache[nopId]

  const abc = esmRequire("./fixture/export/abc.mjs")
  const def = esmRequire("./fixture/export/def.js")
  const nop = esmRequire("nop")

  assert.deepStrictEqual(abc, { a: "a", b: "b", c: "c", default: "default" })
  assert.deepStrictEqual(def, { d: "d", e: "e", f: "f" })
  assert.strictEqual(nop(), void 0)

  const defMod = esmRequire.cache[defId]

  assert.ok(defMod)
  assert.strictEqual(defMod.id, defId)
}
