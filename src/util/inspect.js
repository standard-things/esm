import { defaultInspectOptions, inspect as safeInspect } from "../safe/util.js"

import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import getProxyDetails from "./get-proxy-details.js"
import has from "./has.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import { inspect as realInspect } from "../real/util.js"
import shared from "../shared.js"
import toNamespaceObject from "./to-namespace-object.js"
import unwrapProxy from "./unwrap-proxy.js";

function init() {
  const nonWhitespaceRegExp = /\S/

  const uninitializedValue = {
    [shared.customInspectKey]: (recurseTimes, context) => {
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
      const { customInspect, showProxy } = context

      object = new Proxy(
        wrap(details[0], context, customInspect, showProxy),
        wrap(details[1], context, customInspect, showProxy)
      )
    }

    return inspect(object, context)
  }

  function wrap(target, options, customInspect, showProxy) {
    let inspecting = false

    const proxy = new OwnProxy(target, {
      get: (target, name, receiver) => {
        const { customInspectKey } = shared
        const value = Reflect.get(target, name, receiver)

        if ((name === customInspectKey ||
             name === "inspect") &&
            typeof value === "function" &&
            unwrapProxy(value) === realInspect) {
          return realInspect
        }

        if (inspecting ||
            name !== customInspectKey) {
          return value
        }

        return (...args) => {
          inspecting = true

          let [recurseTimes, context] = args

          const contextAsOptions = assign({}, context)

          contextAsOptions.customInspect = customInspect
          contextAsOptions.showProxy = showProxy
          contextAsOptions.depth = recurseTimes

          try {
            if (target === uninitializedValue) {
              return Reflect.apply(value, target, [recurseTimes, contextAsOptions])
            }

            if (isModuleNamespaceObject(target)) {
              return formatNamespaceObject(target, contextAsOptions)
            }

            if (! showProxy ||
                ! isProxy(target) ||
                isOwnProxy(target)) {
              if (typeof value === "function") {
                if (customInspect) {
                  return Reflect.apply(value, target, [recurseTimes, contextAsOptions])
                }
              } else if (! customInspect) {
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
