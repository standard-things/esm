import assert from "assert"
import a from "./a.js"
import b from "./b.js"

assert.strictEqual(a, "c")
assert.strictEqual(a, b)
