import assert from "assert"

import * as abc1 from "../../fixture/export/abc.mjs"
import abc2, { a as aa, b as bb, c } from "../../fixture/export/abc.mjs"
import * as def1 from "../../fixture/export/def.js"
import def2, * as def3 from "../../fixture/export/def.js"
import { default as def4 } from "../../fixture/export/def.js"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const defNs = {
    d: "d",
    default: { d: "d", e: "e", f: "f" },
    e: "e",
    f: "f"
  }

  assert.deepEqual(abc1, abcNs)
  assert.strictEqual(abc2, "default")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.strictEqual(c, "c")

  assert.deepEqual(def1, defNs)
  assert.strictEqual(def1, def3)
  assert.strictEqual(def1.default, def2)
  assert.strictEqual(def1.default, def4)
}
