"use strict"

const Module = require("module")
const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const filename = path.join(__dirname, "esm.js.gz")
const content = zlib.gunzipSync(fs.readFileSync(filename)).toString()
const mod = new Module(filename, module.parent)

mod._compile(content, filename)
module.exports = mod.exports
