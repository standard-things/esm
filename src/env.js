import FastObject from "./fast-object.js"

import rootModule from "./root-module.js"

const _preloadModules = process._preload_modules || []
const esmPkgMain = __non_webpack_module__.filename
const env = new FastObject

env.preload = rootModule.id === "internal/preload" ||
  _preloadModules.some((child) => child.filename === esmPkgMain)

env.repl = env.preload && process.argv.length < 2

if (! env.repl) {
  env.repl = rootModule.filename === null &&
    rootModule.id === "<repl>" &&
    rootModule.loaded === false &&
    rootModule.parent === void 0 &&
    rootModule.children.some((child) => child.filename === esmPkgMain)
}

export default env
