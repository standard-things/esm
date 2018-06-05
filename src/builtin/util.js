import copyProperty from "../util/copy-property.js"
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

  const safeTypes = safeUtil.types

  let builtinTypes

  if (safeTypes) {
    const builtinIsModuleNamespaceObject = proxyWrap(safeTypes.isModuleNamespaceObject, isModuleNamespaceObject)
    const safeIsProxy = safeTypes.isProxy

    const builtinIsProxy = proxyWrap(safeIsProxy, (value) => {
      return safeIsProxy(value) &&
        ! isOwnProxy(value)
    })

    builtinTypes = new ExObject

    const names = keysAll(safeTypes)

    for (const name of names) {
      if (name === "isModuleNamespaceObject") {
        builtinTypes.isModuleNamespaceObject = builtinIsModuleNamespaceObject
      } else if (name === "isProxy") {
        builtinTypes.isProxy = builtinIsProxy
      } else {
        copyProperty(builtinTypes, safeTypes, name)
      }
    }
  }

  const builtinFormat = proxyWrap(safeUtil.format, format)
  const builtinInspect = proxyWrap(safeUtil.inspect, inspect)
  const safeFormatWithOptions = safeUtil.formatWithOptions

  const builtinFormatWithOptions = safeFormatWithOptions
    ? proxyWrap(safeFormatWithOptions, formatWithOptions)
    : formatWithOptions

  const builtinUtil = new ExObject
  const names = keysAll(realUtil)

  for (const name of names) {
    if (name == "format") {
      builtinUtil.format = builtinFormat
    } else if (name === "formatWithOptions") {
      builtinUtil.formatWithOptions = builtinFormatWithOptions
    } else if (name === "inspect") {
      builtinUtil.inspect = builtinInspect
    } else if (name === "types") {
      builtinUtil.types = builtinTypes
    } else {
      copyProperty(builtinUtil, safeUtil, name)
    }
  }

  return builtinUtil
}

export default shared.inited
  ? shared.module.builtinUtil
  : shared.module.builtinUtil = init()
