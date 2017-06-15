"use strict"

const path = require("path")
const utils = require("./utils.js")

const pkgMain = path.join(__dirname, "../index.js")
let rootModule = module.parent ? module : __non_webpack_module__

while (rootModule.parent != null) {
  rootModule = rootModule.parent
}

if (rootModule.filename === null &&
    rootModule.id === "<repl>" &&
    rootModule.loaded === false &&
    rootModule.parent === void 0 &&
    rootModule.children.some((child) => child.filename === pkgMain)) {
  // Enable ESM in the default Node REPL by loading `@std/esm` upon entering.
  // Custom REPLs can still define their own eval functions to bypass this,
  // but that's a feature, not a drawback.
  const compile = require("./caching-compiler.js").compile
  const Runtime = require("./runtime.js")
  const vm = require("vm")
  const Wrapper = require("./wrapper.js")

  Wrapper.manage(vm, "createScript", function (func, code, options) {
    const pkgInfo = utils.getPkgInfo()
    const wrapped = Wrapper.find(vm, "createScript", pkgInfo.range)
    return wrapped.call(this, func, pkgInfo, code, options)
  })

  Wrapper.wrap(vm, "createScript", function (func, pkgInfo, code, options) {
    const cacheFilename = utils.getCacheFileName(null, code, pkgInfo)
    const cacheValue = pkgInfo.cache[cacheFilename]

    code = utils.isObject(cacheValue)
      ? cacheValue.code
      : compile(code, { cacheFilename, pkgInfo, repl: true }).code

    code = '"use strict";' + code

    return func.call(this, code, options)
  })

  Runtime.enable(rootModule)
}
