"use strict"

const fs = require("fs")
const Module = require("module")
const path = require("path")
const zlib = require("zlib")

const filename = path.join(__dirname, "esm.js.gz")
const content = zlib.gunzipSync(fs.readFileSync(filename)).toString()
const parent = module.parent || module
const mod = new Module(filename, parent)

mod._compile(content, filename)
module.exports = mod.exports
