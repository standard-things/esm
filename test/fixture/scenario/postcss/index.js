"use strict"

const assert = require("assert")
const { log } = console

require = require("../../../../")(module)

const fontFamilySystemUI = require("./main.mjs").default

assert.strictEqual(typeof fontFamilySystemUI, "function")

log("postcss:true")
