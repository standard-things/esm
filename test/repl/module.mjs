import Module from "module"

import path from "path"

const NODE_ENV = String(process.env.NODE_ENV)

const esmPath = NODE_ENV.startsWith("production")
  ? path.resolve("../index.js")
  : path.resolve("../build/esm.js")

// Masquerade as the module of the REPL.
const module = new Module("<repl>")
module.children.push(Module._cache[esmPath])

delete Module._cache[esmPath]
module.require(esmPath)

export default module
