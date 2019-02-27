import { defaultInspectOptions, inspect as safeInspect } from "../safe/util.js"

import GenericFunction from "../generic/function.js"
import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import builtinEntries from "../builtin-entries.js"
import getObjectTag from "./get-object-tag.js"
import getProxyDetails from "./get-proxy-details.js"
import has from "./has.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isModuleNamespaceObjectLike from "./is-module-namespace-object-like.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import isStackTraceMaskable from "./is-stack-trace-maskable.js"
import isUpdatableDescriptor from "./is-updatable-descriptor.js"
import isUpdatableGet from "./is-updatable-get.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import ownPropertyNames from "./own-property-names.js"
import realUtil from "../real/util.js"
import shared from "../shared.js"
import toRawModuleNamespaceObject from "./to-raw-module-namespace-object.js"

function init() {
  const PROXY_PREFIX = "Proxy ["

  const emptyObject = {}
  const nonWhitespaceRegExp = /\S/

  const uninitializedValue = {
    [shared.customInspectKey]: (recurseTimes, { colors }) => {
      const string = "<uninitialized>"

      return colors
        ? stylize(string, "special")
        : string
    }
  }

  function inspect(...args) {
    let [value, options, depth] = args

    if (! isObjectLike(value)) {
      return Reflect.apply(safeInspect, this, args)
    }

    value = prepareValue(value)

    options = typeof options === "boolean"
      ? { showHidden: true }
      : assign({}, options)

    const customInspect = has(options, "customInspect")
      ? options.customInspect
      : defaultInspectOptions.customInspect

    const showProxy = has(options, "showProxy")
      ? options.showProxy
      : defaultInspectOptions.showProxy

    if (depth !== void 0 &&
        ! has(options, "depth")) {
      options.depth = depth
    }

    args[0] = value
    args[1] = options

    const result = Reflect.apply(tryInspect, this, args)

    if (! isWrappable(value) ||
        (result.indexOf(PROXY_PREFIX) === -1 &&
         ! isModuleNamespaceObjectLike(value))) {
      return result
    }

    options.customInspect = true
    options.showProxy = false

    value = wrap(value, options, customInspect, showProxy)

    args[0] = value

    return Reflect.apply(safeInspect, this, args)
  }

  function formatNamespaceObject(namespace, context) {
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

  function formatProxy(proxy, context) {
    const details = getProxyDetails(proxy)

    let object = proxy

    if (details !== void 0) {
      object = new Proxy(
        toInspectable(details[0], context),
        toInspectable(details[1], context)
      )
    }

    const contextAsOptions = assign({}, context)

    contextAsOptions.customInspect = true
    return safeInspect(object, contextAsOptions)
  }

  function isWrappable(value) {
    if (! isObjectLike(value)) {
      return false
    }

    return typeof value === "function" ||
           Array.isArray(value) ||
           Reflect.has(value, Symbol.toStringTag) ||
           value === builtinEntries.process.module.exports ||
           getObjectTag(value) === "[object Object]"
  }

  function prepareValue(value) {
    if (isStackTraceMaskable(value)) {
      maskStackTrace(value)
    }

    return value
  }

  function stylize(string, styleType) {
    const { colors, styles } = shared.module.utilInspect
    const style = styles[styleType]

    if (style === void 0) {
      return string
    }

    const [foregroundCode, backgroundCode] = colors[style]

    return "\u001B[" + foregroundCode + "m" + string + "\u001B[" + backgroundCode + "m"
  }

  function toInspectable(value, options) {
    return {
      [shared.customInspectKey]: (recurseTimes) => {
        const contextAsOptions = assign({}, options)

        contextAsOptions.depth = recurseTimes
        return inspect(value, contextAsOptions)
      }
    }
  }

  function tryGet(object, name) {
    try {
      return Reflect.get(object, name)
    } catch {}

    return uninitializedValue
  }

  function tryInspect(...args) {
    try {
      return Reflect.apply(safeInspect, this, args)
    } catch {}

    return ""
  }

  function wrap(object, options, customInspect, showProxy, map) {
    if (! isWrappable(object)) {
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

        if ((name === customInspectKey ||
             name === "inspect") &&
            value === shared.module.utilInspect) {
          newValue = realUtil.inspect
        } else if (inspecting ||
                   name !== customInspectKey) {
          if (name === "toString" &&
              typeof value === "function") {
            newValue = GenericFunction.bind(value, object)
          }
        } else {
          newValue = (...args) => {
            inspecting = true

            let [recurseTimes, context] = args

            const contextAsOptions = assign({}, context)

            contextAsOptions.customInspect = customInspect
            contextAsOptions.showProxy = showProxy
            contextAsOptions.depth = recurseTimes

            try {
              if (object === uninitializedValue) {
                return Reflect.apply(value, object, [recurseTimes, contextAsOptions])
              }

              if (isModuleNamespaceObject(object)) {
                return formatNamespaceObject(object, contextAsOptions)
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

              return formatProxy(object, contextAsOptions)
            } finally {
              inspecting = false
            }
          }
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
            descriptor.value = wrap(value, options, customInspect, showProxy, map)
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

  return inspect
}

export default shared.inited
  ? shared.module.utilInspect
  : shared.module.utilInspect = init()
