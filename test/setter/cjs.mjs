import assert from "assert"

// Import the CommonJS module first, but do not register any setters.
import "../fixture/cycle/cjs.js"
import { getSum } from "../fixture/cycle/esm.mjs"

export function check() {
  assert.strictEqual(getSum(), 3)
}
