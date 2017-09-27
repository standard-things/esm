import assert from "assert"
import cycle from "../fixture/seal/cycle.mjs"

export default () => {
  assert.strictEqual(cycle.a, "a")
}
