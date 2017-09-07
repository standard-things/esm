import assert from "assert"
import bridge from "./seal/bridge.mjs"

export function check() {
  assert.strictEqual(bridge.a, "a")
}
