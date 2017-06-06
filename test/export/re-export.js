import assert from "assert"
import { abc, d, e, f } from "../fixture/export/all-multiple.js"

export function check() {
  assert.strictEqual(abc.a, "a")
  assert.strictEqual(abc.b, "b")
  assert.strictEqual(abc.c, "c")
  assert.strictEqual(d, "d")
  assert.strictEqual(e, "e")
  assert.strictEqual(f, "f")
}
