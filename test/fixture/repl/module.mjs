import __dirname from "../../__dirname.js"
import module from "../../module.js"
import path from "path"
import require from "../../require.js"

// Masquerade as the REPL module.
const pkgPath = path.resolve(__dirname, "../index.js")
const repl = new module.constructor("<repl>")

repl.children.push(require.cache[pkgPath])
delete require.cache[pkgPath]
repl.require(pkgPath)

export default repl
