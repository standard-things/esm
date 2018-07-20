import assert from "assert"
import bluebird from "bluebird"
import { log } from "console"

assert.ok(String(bluebird.all).includes("__NR_wrapped"))

log("newrelic:true")
