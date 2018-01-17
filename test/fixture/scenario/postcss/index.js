"use strict"

const assert = require("assert")

require = require("../../../../")(module)
const fontFamilySystemUI = require("./main.mjs").default

assert.strictEqual(typeof fontFamilySystemUI, "function")
