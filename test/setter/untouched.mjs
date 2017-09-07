import assert from "assert"

// Import the CommonJS module first, but do not register any setters.
import "./untouched/cjs.js"
import { sum } from "./untouched/esm.mjs"

export function check() {
  assert.strictEqual(sum(), 3)
}
