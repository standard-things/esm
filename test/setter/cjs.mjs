import assert from "assert"

// Import the CommonJS module first, but do not register any setters.
import "../fixture/cycle/cjs.js"
import { sum } from "../fixture/cycle/esm.mjs"

export function check() {
  assert.strictEqual(sum(), 3)
}
