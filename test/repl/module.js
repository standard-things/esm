"use strict"

// Masquerade as the module of the REPL.
module.children = [require.cache[require.resolve("../../index.js")]]
module.filename = null
module.id = "<repl>"
module.loaded = false
module.parent = void 0

delete require.cache[require.resolve("../../lib/repl-hook.js")]
require("../../lib/repl-hook.js")

module.exports = module
