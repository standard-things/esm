"use strict"

const { log } = console
const esmRequire = require("@std/esm")(module)
const actual = JSON.stringify(esmRequire("../export/abc.mjs"))

log("std-esm:" + actual)
