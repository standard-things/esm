"use strict"

const assert = require("assert")

require = require("../../../../")(module)

assert.strictEqual(typeof require("./main.mjs").default, "function")
