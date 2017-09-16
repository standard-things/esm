import assert from "assert"
import bridge from "./seal/bridge.mjs"

export default () => {
  assert.strictEqual(bridge.a, "a")
}
