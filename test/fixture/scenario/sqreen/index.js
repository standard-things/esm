import assert from "assert"
import a from "./a.js"
import b from "./b.js"

assert.strictEqual(a, "TEXT")
assert.strictEqual(a, b)
