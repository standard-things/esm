import assert from "assert"
import createNamespace from "../../create-namespace.js"
import * as abc1 from "../../fixture/export/abc.mjs"
import abc2, { a as aa, b as bb, c } from "../../fixture/export/abc.mjs"
import * as def1 from "../../fixture/export/def.js"
import def2, * as def3 from "../../fixture/export/def.js"
import { default as def4 } from "../../fixture/export/def.js"

export default () => {
  const abcNs = createNamespace({
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  })

  const defNs = createNamespace({
    d: "d",
    default: { d: "d", e: "e", f: "f" },
    e: "e",
    f: "f"
  })

  assert.deepStrictEqual(abc1, abcNs)
  assert.strictEqual(abc2, "default")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.strictEqual(c, "c")

  assert.deepStrictEqual(def1, defNs)
  assert.strictEqual(def1, def3)
  assert.strictEqual(def1.default, def2)
  assert.strictEqual(def1.default, def4)
}
