import assert from "assert"
import rewire from "rewire"

const getter = rewire("./a.js")

getter.__set__("a", "b")

assert.strictEqual(getter(), "b")
