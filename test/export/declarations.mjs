import assert from "assert"
import { a, b, c, d } from "../fixture/export/declarations.mjs"

export default function () {
  assert.strictEqual(a, "a")
  assert.strictEqual(b(), d)
  assert.strictEqual(c, "c")
  assert.strictEqual(d(), b)
}
