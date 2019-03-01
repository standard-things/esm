import assert from "assert"
import def, { a } from "../fixture/cycle/wasm/a.js"
import { b } from "../fixture/cycle/wasm/b.wasm"

export default () => {
  assert.strictEqual(a(1, 2), 3)
  assert.strictEqual(b(1, 2), 3)
  assert.strictEqual(def, 3)
}
