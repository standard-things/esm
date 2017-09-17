import assert from "assert"
import bridge from "../fixture/seal/bridge.mjs"

export default () => {
  assert.strictEqual(bridge.a, "a")
}
