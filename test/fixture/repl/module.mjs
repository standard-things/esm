import module from "../../module.js"
import path from "path"
import require from "../../require.js"
import url from "url"

const __filename = new url.URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

// Masquerade as the REPL module.
const pkgPath = path.resolve(__dirname, "../../../index.js")
const repl = new module.constructor("<repl>")

repl.children.push(require.cache[pkgPath])
delete require.cache[pkgPath]
repl.require(pkgPath)

export default repl
