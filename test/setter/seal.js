import assert from "assert"
import bridge from "../fixture/cycle/bridge-owner.js"

export function check() {
  assert.strictEqual(bridge.a, "a")
}
