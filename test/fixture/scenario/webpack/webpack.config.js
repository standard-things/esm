import { ProvidePlugin } from "webpack"

import assert from "assert"
import { log } from "console"

assert.strictEqual(typeof ProvidePlugin, "function")

log("webpack:true")
