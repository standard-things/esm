"use strict"

const Module = require("module")

const { gunzipSync } = require("zlib")
const { join } = require("path")
const { readFileSync } = require("fs")

const filename = join(__dirname, "esm.js.gz")
const content = gunzipSync(readFileSync(filename)).toString()
const mod = new Module(filename, module.parent)

mod._compile(content, filename)
module.exports = mod.exports
