import { defaultInspectOptions, inspect as safeInspect } from "../safe/util.js"

import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import getProxyDetails from "./get-proxy-details.js"
import has from "./has.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import shared from "../shared.js"
import toNamespaceObject from "./to-namespace-object.js"

function init() {
  const nonWhitespaceRegExp = /\S/

  const uninitializedValue = {
    [shared.customInspectKey]: uninitializedCustomizer
  }

  function inspect(...args) {
    let [value, options, depth] = args

    if (! isObjectLike(value)) {
      return Reflect.apply(safeInspect, this, args)
    }

    options = typeof options === "boolean"
      ? { showHidden: true }
      : assign({}, options)

    const customInspect = has(options, "customInspect")
      ? options.customInspect
      : defaultInspectOptions.customInspect

    const showProxy = has(options, "showProxy")
      ? options.showProxy
      : defaultInspectOptions.showProxy

    options.customInspect = true
    options.showProxy = false

    if (depth !== void 0 &&
        ! has(options, "depth")) {
      options.depth = depth
    }

    args[0] = wrap(value, options, customInspect, showProxy)
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

    const result = inspect(object, context)
    const indentation = result.slice(0, result.search(nonWhitespaceRegExp))
    const trimmed = result.slice(result.indexOf("{"), result.lastIndexOf("}") + 1)

    return indentation + "[Module] " + trimmed
  }

  function formatProxy(proxy, context) {
    const details = getProxyDetails(proxy)

    let object = proxy

    if (details) {
      const contextAsOptions = assign({}, context)
      const { customInspectKey } = shared
      const [target, handler] = details

      object = new Proxy({
        [customInspectKey]: (recurseTimes) => {
          contextAsOptions.depth = recurseTimes
          return inspect(target, contextAsOptions)
        }
      }, {
        [customInspectKey]: (recurseTimes) => {
          contextAsOptions.depth = recurseTimes
          return inspect(handler, contextAsOptions)
        }
      })
    }

    return safeInspect(object, context)
  }

  function uninitializedCustomizer(recurseTimes, context) {
    return context.stylize("<uninitialized>", "special")
  }

  function wrap(object, options, customInspect, showProxy) {
    let initedContext = false
    let inspecting = false

    const proxy = new OwnProxy(object, {
      get: (target, name, receiver) => {
        const value = Reflect.get(target, name, receiver)

        if (inspecting ||
            name !== shared.customInspectKey) {
          return value
        }

        return (...args) => {
          inspecting = true

          let [recurseTimes, context] = args

          if (! initedContext) {
            initedContext = true
            context.customInspect = customInspect
            context.showProxy = showProxy
          }

          const contextAsOptions = assign({}, context)

          contextAsOptions.depth = recurseTimes

          try {
            if (isModuleNamespaceObject(target)) {
              return formatNamespaceObject(target, contextAsOptions)
            }

            const isCustomizer = typeof value === "function"

            if (! showProxy ||
                ! isProxy(target) ||
                isOwnProxy(target)) {
              if (isCustomizer &&
                  (customInspect ||
                   value === uninitializedCustomizer)) {
                return Reflect.apply(value, target, args)
              }

              if (! customInspect &&
                  ! isCustomizer) {
                contextAsOptions.customInspect = true
              }

              contextAsOptions.showProxy = false
              return safeInspect(proxy, contextAsOptions)
            }

            return formatProxy(target, contextAsOptions)
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

        descriptor.value = wrap(value, options, customInspect, showProxy)
        return descriptor
      }
    })

    return proxy
  }

  return inspect
}

export default shared.inited
  ? shared.module.utilInspect
  : shared.module.utilInspect = init()
