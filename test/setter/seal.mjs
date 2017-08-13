import assert from "assert"
import bridge from "../fixture/cycle/bridge-owner.mjs"

export function check() {
  assert.strictEqual(bridge.a, "a")
}
