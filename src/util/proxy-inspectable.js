import { inspect as safeInspect } from "../safe/util.js"

import GenericFunction from "../generic/function.js"
import GenericObject from "../generic/object.js"
import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import builtinInspect from "../builtin/inspect.js"
import emptyObject from "./empty-object.js"
import getProxyDetails from "./get-proxy-details.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import isProxyInspectable from "./is-proxy-inspectable.js"
import isStackTraceMaskable from "./is-stack-trace-maskable.js"
import isUpdatableDescriptor from "./is-updatable-descriptor.js"
import isUpdatableGet from "./is-updatable-get.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import ownPropertyNames from "./own-property-names.js"
import realUtil from "../real/util.js"
import shared from "../shared.js"
import toExternalFunction from "./to-external-function.js"
import toRawModuleNamespaceObject from "./to-raw-module-namespace-object.js"

function init() {
  const UNINITIALIZED_BINDING = "<uninitialized>"

  const nonWhitespaceRegExp = /\S/

  const uninitializedValue = { __proto__: null }

  function proxyInspectable(object, options, inspect, map) {
    if (! isProxyInspectable(object)) {
      return object
    }

    if (map === void 0) {
      map = new Map
    } else {
      const cached = map.get(object)

      if (cached !== void 0) {
        return cached
      }
    }

    let objectIsProxy
    let objectIsOwnProxy
    let inspecting = false

    const proxy = new OwnProxy(object, {
      get(object, name, receiver) {
        if (receiver === decoyProxy ||
            receiver === proxy) {
          receiver = object
        }

        const { customInspectKey } = shared
        const value = Reflect.get(object, name, receiver)

        let newValue = value

        if (value === builtinInspect &&
            (name === customInspectKey ||
             name === "inspect")) {
          newValue = realUtil.inspect
        } else if (inspecting ||
                   name !== customInspectKey) {
          if (name === "toString" &&
              typeof value === "function") {
            newValue = GenericFunction.bind(value, object)
          }
        } else {
          newValue = toExternalFunction((...args) => {
            inspecting = true

            let [recurseTimes, context] = args

            const contextAsOptions = assign(GenericObject.create(), context)
            const { showProxy } = options

            contextAsOptions.customInspect = options.customInspect
            contextAsOptions.depth = recurseTimes
            contextAsOptions.showProxy = showProxy

            try {
              if (object === uninitializedValue) {
                return contextAsOptions.colors
                  ? stylize(UNINITIALIZED_BINDING, "special", inspect)
                  : UNINITIALIZED_BINDING
              }

              if (isModuleNamespaceObject(object)) {
                return formatNamespaceObject(object, contextAsOptions, inspect)
              }

              if (objectIsOwnProxy === void 0) {
                objectIsOwnProxy = isOwnProxy(object)
              }

              if (objectIsProxy === void 0) {
                objectIsProxy = isProxy(object)
              }

              if (! showProxy ||
                  ! objectIsProxy ||
                  objectIsOwnProxy) {
                if (typeof value !== "function") {
                  contextAsOptions.customInspect = true
                }

                contextAsOptions.showProxy = false

                return safeInspect(proxy, contextAsOptions)
              }

              return formatProxy(object, contextAsOptions, inspect)
            } finally {
              inspecting = false
            }
          })
        }

        if (newValue !== value &&
            isUpdatableGet(object, name)) {
          return newValue
        }

        return prepareValue(value)
      },
      getOwnPropertyDescriptor(object, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

        if (isUpdatableDescriptor(descriptor)) {
          const { value } = descriptor

          if (isObjectLike(value)) {
            descriptor.value = proxyInspectable(value, options, inspect, map)
          }
        }

        return descriptor
      }
    })

    // Wrap `proxy` in a decoy proxy so that `proxy` will be used as the
    // unwrapped value to inspect.
    const decoyProxy = new OwnProxy(proxy, emptyObject)

    map.set(object, decoyProxy)
    map.set(proxy, decoyProxy)
    map.set(decoyProxy, decoyProxy)

    return decoyProxy
  }

  function formatNamespaceObject(namespace, context, inspect) {
    // Avoid `Object.keys()` because it calls `[[GetOwnProperty]]()`,
    // which calls `[[Get]]()`, which calls `GetBindingValue()`,
    // which throws for uninitialized bindings.
    //
    // Section 8.1.1.5.1: GetBindingValue()
    // Step 5: Throw a reference error if the binding is uninitialized.
    // https://tc39.github.io/ecma262/#sec-module-environment-records-getbindingvalue-n-s
    const names = ownPropertyNames(namespace)
    const object = toRawModuleNamespaceObject()

    for (const name of names) {
      object[name] = tryGet(namespace, name)
    }

    const result = inspect(object, context)
    const indentation = result.slice(0, result.search(nonWhitespaceRegExp))
    const trimmed = result.slice(result.indexOf("{"), result.lastIndexOf("}") + 1)

    return indentation + "[Module] " + trimmed
  }

  function formatProxy(proxy, context, inspect) {
    const details = getProxyDetails(proxy)

    let object = proxy

    if (details !== void 0) {
      object = new Proxy(
        toInspectable(details[0], context, inspect),
        toInspectable(details[1], context, inspect)
      )
    }

    const contextAsOptions = assign({}, context)

    contextAsOptions.customInspect = true

    return safeInspect(object, contextAsOptions)
  }

  function prepareValue(value) {
    if (isStackTraceMaskable(value)) {
      maskStackTrace(value)
    }

    return value
  }

  function stylize(string, styleType, inspect) {
    const style = inspect.styles[styleType]

    if (style === void 0) {
      return string
    }

    const [foregroundCode, backgroundCode] = inspect.colors[style]

    return "\u001B[" + foregroundCode + "m" + string + "\u001B[" + backgroundCode + "m"
  }

  function toInspectable(value, options, inspect) {
    return {
      __proto__: null,
      [shared.customInspectKey]: toExternalFunction((recurseTimes) => {
        const contextAsOptions = assign(GenericObject.create(), options)

        contextAsOptions.depth = recurseTimes

        return inspect(value, contextAsOptions)
      })
    }
  }

  function tryGet(object, name) {
    try {
      return Reflect.get(object, name)
    } catch {}

    return uninitializedValue
  }

  return proxyInspectable
}

export default shared.inited
  ? shared.module.utilProxyInspectable
  : shared.module.utilProxyInspectable = init()
