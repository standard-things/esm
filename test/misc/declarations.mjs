import assert from "assert"
import { a } from "../fixture/cycle/declarations/a.mjs"
import def, { b } from "../fixture/cycle/declarations/b.mjs"

export default () => {
  assert.strictEqual(a(), true)
  assert.strictEqual(b(), true)
  assert.strictEqual(def, true)
}
