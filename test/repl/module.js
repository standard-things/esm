"use strict"

const path = require("path")
const esmPath = path.join(__dirname, "../../build/esm.js")

// Masquerade as the module of the REPL.
module.children = [require.cache[esmPath]]
module.filename = null
module.id = "<repl>"
module.loaded = false
module.parent = void 0

delete require.cache[esmPath]
require(esmPath)

module.exports = module
