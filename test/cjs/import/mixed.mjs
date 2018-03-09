import assert from "assert"
import createNamespace from "../../create-namespace.js"
import abc1, { a as aa, b as bb, c } from "../../fixture/export/abc.mjs"
import * as abc2 from "../../fixture/export/abc.mjs"
import def1, * as def2 from "../../fixture/export/def.js"
import * as def3 from "../../fixture/export/def.js"
import { default as def4 } from "../../fixture/export/def.js"

export default () => {
  const abcNs = createNamespace({
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  })

  const defNs = createNamespace({
    default: { d: "d", e: "e", f: "f" }
  })

  assert.strictEqual(abc1, "default")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.strictEqual(c, "c")
  assert.deepStrictEqual(abc2, abcNs)

  assert.strictEqual(def1, def2.default)
  assert.strictEqual(def4, def2.default)
  assert.strictEqual(def2, def3)
  assert.deepStrictEqual(def2, defNs)
}
