import module from "../module.js"
import path from "path"
import require from "../require.js"

const Module = module.constructor
const NODE_ENV = String(process.env.NODE_ENV)

const esmPath = NODE_ENV.startsWith("production")
  ? path.resolve("../index.js")
  : path.resolve("../build/esm.js")

// Masquerade as the module of the REPL.
const mod = new Module("<repl>")
mod.children.push(require.cache[esmPath])

delete require.cache[esmPath]
mod.require(esmPath)

export default mod
