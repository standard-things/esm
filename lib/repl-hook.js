import compiler from "./caching-compiler.js"
import path from "path"
import Runtime from "./runtime.js"
import utils from "./utils.js"
import vm from "vm"
import Wrapper from "./wrapper.js"

const pkgMain = __non_webpack_module__.filename
let rootModule = __non_webpack_module__

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
  const moduleAlias = utils.encodeIdent("module")

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
      : compiler.compile(code, { cacheFilename, pkgInfo, repl: true }).code

    code = '"use strict";const ' + moduleAlias + "=module;" + code

    return func.call(this, code, options)
  })

  Runtime.enable(rootModule)
}
