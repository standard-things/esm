"use strict"

// Masquerade as the module of the REPL.
module.children = [require.cache[require.resolve("../../dist/esm.js")]]
module.filename = null
module.id = "<repl>"
module.loaded = false
module.parent = void 0

delete require.cache[require.resolve("../../dist/esm.js")]
require("../../dist/esm.js")

module.exports = module
