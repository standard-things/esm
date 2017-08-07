/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const Module = require("module")

const gunzipSync = require("zlib").gunzipSync
const join = require("path").join
const readFileSync = require("fs").readFileSync

const filename = join(__dirname, "esm.js.gz")
const content = gunzipSync(readFileSync(filename)).toString()
const mod = new Module(filename, module.parent)

mod._compile(content, filename)
module.exports = mod.exports
