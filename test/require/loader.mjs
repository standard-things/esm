import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"
import path from "path"
import require from "../require.js"

const abcPath = path.resolve("fixture/export/abc.mjs")
const defPath = path.resolve("fixture/export/def.js")
const nopPath = require.resolve("nop")

export default () => {
  const esmRequire = makeRequire(module)

  delete esmRequire.cache[abcPath]
  delete esmRequire.cache[defPath]
  delete esmRequire.cache[nopPath]

  const abc = esmRequire("./fixture/export/abc.mjs")
  const def = esmRequire("./fixture/export/def.js")
  const nop = esmRequire("nop")

  assert.deepStrictEqual(abc, { a: "a", b: "b", c: "c", default: "default" })
  assert.deepStrictEqual(def, { d: "d", e: "e", f: "f" })
  assert.strictEqual(nop(), void 0)

  const defMod = esmRequire.cache[defPath]

  assert.ok(defMod)
  assert.strictEqual(defMod.id, defPath)
}
