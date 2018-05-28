import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import getProxyDetails from "./get-proxy-details.js"
import has from "./has.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import { inspect as safeInspect } from "../safe/util.js"
import realUtil from "../real/util.js"
import shared from "../shared.js"
import toNamespaceObject from "./to-namespace-object.js"

const uninitializedValue = {
  [shared.customInspectKey](recurseTimes, context) {
    return context.stylize("<uninitialized>", "special")
  }
}

function inspect(...args) {
  let [value, options, depth] = args

  if (! isObjectLike(value)) {
    return Reflect.apply(safeInspect, this, args)
  }

  options = typeof options === "boolean"
    ? { showHidden: true }
    : assign({}, options)

  const showProxy = has(options, "showProxy")
    ? options.showProxy
    : realUtil.inspect.defaultOptions.showProxy

  options.showProxy = false

  if (depth !== void 0 &&
      ! has(options, "depth")) {
    options.depth = depth
  }

  args[0] = wrap(value, options, showProxy)
  args[1] = options
  return Reflect.apply(safeInspect, this, args)
}

function formatNamespaceObject(namespace, options) {
  return safeInspect(toNamespaceObject(namespace, (target, name) => {
    try {
      return target[name]
    } catch (e) {}

    return uninitializedValue
  }), options)
}

function formatProxy(proxy, options) {
  const { depth } = options

  if (depth != null) {
    if (depth < 0) {
      return options.stylize("Proxy [Array]", "special")
    }

    options.depth -= 1
  }

  const details = getProxyDetails(proxy)

  options.indentationLvl += 2

  return "Proxy [" +
    safeInspect(details[0], options) + ", " +
    safeInspect(details[1], options) + "]"
}

function wrap(object, options, showProxy) {
  let inspecting = false

  return new OwnProxy(object, {
    get: (target, name, receiver) => {
      const value = Reflect.get(target, name, receiver)

      if (inspecting ||
          name !== shared.customInspectKey) {
        return value
      }

      return function (...args) {
        inspecting = true

        let [recurseTimes, context] = args

        const [unwrapped] = getProxyDetails(this)

        options = assign({}, options, context)
        options.depth = recurseTimes

        try {
          if (isModuleNamespaceObject(unwrapped)) {
            return formatNamespaceObject(this, options)
          }

          if (! showProxy ||
              ! isProxy(unwrapped) ||
              isOwnProxy(unwrapped)) {
            if (typeof value !== "function") {
              return safeInspect(this, options)
            }

            args[1] = assign({}, context)
            args[1].showProxy = showProxy
            return Reflect.apply(value, unwrapped, args)
          }

          return formatProxy(unwrapped, options)
        } finally {
          inspecting = false
        }
      }
    },

    getOwnPropertyDescriptor: (target, name) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (! descriptor ||
          ! Reflect.has(descriptor, "value")) {
        return descriptor
      }

      const { value } = descriptor

      if (! isObjectLike(value)) {
        return descriptor
      }

      descriptor.value = wrap(value, showProxy)
      return descriptor
    }
  })
}

export default inspect
