import assert from "assert"
import add from "./add.mjs"
import { log } from "console"

assert.strictEqual(add(1, 2), 3)

log("esmod-pmb:true")
