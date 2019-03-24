import GenericObject from "../generic/object.js"

import builtinInspect from "./inspect.js"
import copyProperty from "../util/copy-property.js"
import format from "../util/format.js"
import formatWithOptions from "../util/format-with-options.js"
import isModuleNamespaceObject from "../util/is-module-namespace-object.js"
import isObjectLike from "../util/is-object-like.js"
import isOwnProxy from "../util/is-own-proxy.js"
import ownKeys from "../util/own-keys.js"
import proxyWrap from "../util/proxy-wrap.js"
import safeUtil from "../safe/util.js"
import toWrapper from "../util/to-wrapper.js"

// `util.formatWithOptions()` and `util.types` were added in Node 10.
const safeFormatWithOptions = safeUtil.formatWithOptions
const safeTypes = safeUtil.types

let builtinTypes

if (isObjectLike(safeTypes)) {
  builtinTypes = GenericObject.create()

  const builtinIsModuleNamespaceObject = proxyWrap(
    safeTypes.isModuleNamespaceObject,
    toWrapper(isModuleNamespaceObject)
  )

  const builtinIsProxy = proxyWrap(safeTypes.isProxy, (func, [value]) =>
    func(value) &&
    ! isOwnProxy(value)
  )

  const typesNames = ownKeys(safeTypes)

  for (const name of typesNames) {
    if (name === "isModuleNamespaceObject") {
      builtinTypes.isModuleNamespaceObject = builtinIsModuleNamespaceObject
    } else if (name === "isProxy") {
      builtinTypes.isProxy = builtinIsProxy
    } else {
      copyProperty(builtinTypes, safeTypes, name)
    }
  }
}

const builtinUtil = GenericObject.create()
const utilNames = ownKeys(safeUtil)

for (const name of utilNames) {
  if (name === "format") {
    builtinUtil.format = proxyWrap(safeUtil.format, toWrapper(format))
  } else if (name === "formatWithOptions") {
    if (typeof safeFormatWithOptions === "function") {
      builtinUtil.formatWithOptions = proxyWrap(safeFormatWithOptions, toWrapper(formatWithOptions))
    }
  } else if (name === "inspect") {
    builtinUtil.inspect = builtinInspect
  } else if (name === "types") {
    if (builtinTypes !== void 0) {
      builtinUtil.types = builtinTypes
    }
  } else {
    copyProperty(builtinUtil, safeUtil, name)
  }
}

export default builtinUtil
