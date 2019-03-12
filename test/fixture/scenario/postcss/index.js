"use strict"

const assert = require("assert")

require = require("../../../../index.js")(module)

assert.strictEqual(typeof require("./main.mjs").default, "function")
