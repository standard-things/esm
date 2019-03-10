import { defaultInspectOptions, inspect as safeInspect } from "../safe/util.js"

import GenericObject from "../generic/object.js"
import Loader from "../loader.js"

import assign from "./assign.js"
import has from "./has.js"
import isModuleNamespaceObjectLike from "./is-module-namespace-object-like.js"
import isObjectLike from "./is-object-like.js"
import isProxyInspectable from "./is-proxy-inspectable.js"
import isStackTraceMaskable from "./is-stack-trace-maskable.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import proxyInspectable from "./proxy-inspectable.js"

const PROXY_PREFIX = "Proxy ["

function inspect(...args) {
  let [value, options, depth] = args

  if (! isObjectLike(value)) {
    return Reflect.apply(safeInspect, this, args)
  }

  value = prepareValue(value)

  const customOptions = GenericObject.create()

  if (typeof options === "boolean") {
    customOptions.showHidden = true
  } else {
    assign(customOptions, options)
  }

  const customInspect = has(customOptions, "customInspect")
    ? customOptions.customInspect
    : defaultInspectOptions.customInspect

  const showProxy = has(customOptions, "showProxy")
    ? customOptions.showProxy
    : defaultInspectOptions.showProxy

  if (depth !== void 0 &&
      ! has(customOptions, "depth")) {
    customOptions.depth = depth
  }

  args[0] = value
  args[1] = customOptions

  const result = Reflect.apply(tryInspect, this, args)

  if (! isProxyInspectable(value) ||
      (result.indexOf(PROXY_PREFIX) === -1 &&
       ! isModuleNamespaceObjectLike(value))) {
    return result
  }

  customOptions.customInspect = customInspect
  customOptions.showProxy = showProxy

  options = assign(GenericObject.create(), customOptions)
  args[0] = proxyInspectable(value, options, inspect)

  customOptions.customInspect = true
  customOptions.showProxy = false

  return Reflect.apply(safeInspect, this, args)
}

function prepareValue(value) {
  if (! Loader.state.package.default.options.debug &&
      isStackTraceMaskable(value)) {
    maskStackTrace(value)
  }

  return value
}

function tryInspect(...args) {
  try {
    return Reflect.apply(safeInspect, this, args)
  } catch {}

  return ""
}

export default inspect
