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

function formatNamespaceObject(namespace, context) {
  const object = toNamespaceObject()
  const names = Object.getOwnPropertyNames(namespace)

  for (const name of names) {
    try {
      object[name] = namespace[name]
    } catch (e) {
      object[name] = uninitializedValue
    }
  }

  return inspect(object, context)
}

function formatProxy(proxy, context) {
  const contextAsOptions = assign({}, context)
  const [object, handler] = getProxyDetails(proxy)

  const mockObject = {
    [shared.customInspectKey]: (recurseTimes) => {
      contextAsOptions.depth = recurseTimes
      return inspect(object, contextAsOptions)
    }
  }

  const mockHandler = {
    [shared.customInspectKey]: (recurseTimes) => {
      contextAsOptions.depth = recurseTimes
      return inspect(handler, contextAsOptions)
    }
  }

  return safeInspect(new Proxy(mockObject, mockHandler), context)
}

function wrap(object, options, showProxy) {
  let initedContext = false
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

        if (! initedContext) {
          initedContext = true
          context.showProxy = showProxy
        }

        const contextAsOptions = assign({}, context)
        const [unwrapped] = getProxyDetails(this)

        contextAsOptions.depth = recurseTimes

        try {
          if (isModuleNamespaceObject(unwrapped)) {
            return formatNamespaceObject(this, contextAsOptions)
          }

          if (! showProxy ||
              ! isProxy(unwrapped) ||
              isOwnProxy(unwrapped)) {
            if (typeof value === "function") {
              return Reflect.apply(value, unwrapped, args)
            }

            contextAsOptions.showProxy = false
            return safeInspect(this, contextAsOptions)
          }

          return formatProxy(unwrapped, contextAsOptions)
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
