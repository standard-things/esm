import assert from "assert"
import bridge from "./seal/bridge.mjs"

export default function () {
  assert.strictEqual(bridge.a, "a")
}
