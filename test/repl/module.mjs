import module from "../module.js"
import path from "path"
import require from "../require.js"

// Masquerade as the REPL module.
const pkgPath = path.resolve("../index.js")
const mod = new module.constructor("<repl>")

mod.children.push(require.cache[pkgPath])
delete require.cache[pkgPath]
mod.require(pkgPath)

export default mod
