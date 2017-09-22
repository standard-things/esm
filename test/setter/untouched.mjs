import assert from "assert"

// Import the CJS module first, but do not register any setters.
import "../fixture/untouched/cjs.js"
import { sum } from "../fixture/untouched/esm.mjs"

export default () => {
  assert.strictEqual(sum(), 3)
}
