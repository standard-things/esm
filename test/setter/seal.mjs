import assert from "assert"
import bridge from "../fixture/cycle/bridge.mjs"

export function check() {
  assert.strictEqual(bridge.a, "a")
}
