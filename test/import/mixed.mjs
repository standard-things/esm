import assert from "assert"
import createNamespace from "../create-namespace.js"
import abc1, { a as aa, b as bb, c } from "../fixture/export/abc.mjs"
import * as abc2 from "../fixture/export/abc.mjs"

export default () => {
  const abcNs = createNamespace({
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  })

  assert.strictEqual(abc1, "default")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.strictEqual(c, "c")
  assert.deepStrictEqual(abc2, abcNs)
}
