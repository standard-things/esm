import assert from "assert"
import { log } from "console"
import a from "./a.js"
import b from "./b.js"

assert.strictEqual(a, "TEXT")
assert.strictEqual(a, b)

log("sqreen:true")
