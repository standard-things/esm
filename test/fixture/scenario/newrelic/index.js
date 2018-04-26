import assert from "assert"
import bluebird from "bluebird"

assert.ok(String(bluebird.all).includes("__NR_wrapped"))
