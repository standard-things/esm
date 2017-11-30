import assert from "assert"
import { a, b, c, d, e } from "../fixture/export/declarations.mjs"

export default () => {
  assert.strictEqual(a, "a")
  assert.strictEqual(b(), d)
  assert.strictEqual(c, "c")
  assert.strictEqual(d(), b)
  assert.strictEqual(e({foo: 42}).foo, 42)
}
