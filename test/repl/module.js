import __dirname from "../__dirname.js"
import Module from "module"
import path from "path"

// Masquerade as the module of the REPL.
const esmPath = path.join(__dirname, "../build/esm.js")
const module = new Module("<repl>")
module.children.push(Module._cache[esmPath])

delete Module._cache[esmPath]
module.require(esmPath)

export default module
