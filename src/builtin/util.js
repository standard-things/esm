import copyProperty from "../util/copy-property.js"
import has from "../util/has.js"
import format from "../util/format.js"
import formatWithOptions from "../util/format-with-options.js"
import inspect from "../util/inspect.js"
import isModuleNamespaceObject from "../util/is-module-namespace-object.js"
import isOwnProxy from "../util/is-own-proxy.js"
import keysAll from "../util/keys-all.js"
import proxyWrap from "../util/proxy-wrap.js"
import realUtil from "../real/util.js"
import safeUtil from "../safe/util.js"
import shared from "../shared.js"

function init() {
  const ExObject = shared.external.Object

  const builtinUtil = new ExObject
  const names = keysAll(realUtil)

  for (const name of names) {
    if (name !== "format" &&
        name !== "formatWithOptions" &&
        name !== "inspect" &&
        name !== "types") {
      copyProperty(builtinUtil, safeUtil, name)
    }
  }

  const safeFormatWithOptions = safeUtil.formatWithOptions
  const safeTypes = safeUtil.types

  builtinUtil.format = proxyWrap(safeUtil.format, format)

  builtinUtil.formatWithOptions = safeFormatWithOptions
    ? proxyWrap(safeFormatWithOptions, formatWithOptions)
    : formatWithOptions

  builtinUtil.inspect = proxyWrap(safeUtil.inspect, inspect)

  if (safeTypes) {
    const names = keysAll(safeTypes)
    const safeIsProxy = safeTypes.isProxy
    const types = new ExObject

    for (const name of names) {
      if (name !== "isModuleNamespaceObject" &&
          name !== "isProxy") {
        copyProperty(types, safeTypes, name)
      }
    }

    types.isModuleNamespaceObject = proxyWrap(safeTypes.isModuleNamespaceObject, isModuleNamespaceObject)

    types.isProxy = proxyWrap(safeIsProxy, (value) => {
      return ! isOwnProxy(value) &&
        safeIsProxy(value)
    })

    builtinUtil.types = types
  }

  const { customInspectKey } = shared

  // Defining a truthy, but non-function value, for `customInspectKey` will
  // inform builtin `inspect()` to bypass the deprecation warning for the
  // custom `util.inspect()` function when inspecting `util`.
  if (! has(builtinUtil, customInspectKey)) {
    Reflect.defineProperty(builtinUtil, customInspectKey, {
      configurable: true,
      value: true,
      writable: true
    })
  }

  return builtinUtil
}

export default shared.inited
  ? shared.module.builtinUtil
  : shared.module.builtinUtil = init()
