import { config, stderr, stdout } from "../safe/process.js"

import ENV from "../constant/env.js"

import GenericFunction from "../generic/function.js"
import GenericObject from "../generic/object.js"
import OwnProxy from "../own/proxy.js"

import assign from "../util/assign.js"
import binding from "../binding.js"
import builtinUtil from "./util.js"
import copyProperty from "../util/copy-property.js"
import { defaultInspectOptions } from "../safe/util.js"
import has from "../util/has.js"
import isObjectLike from "../util/is-object.js"
import isUpdatableDescriptor from "../util/is-updatable-descriptor.js"
import keys from "../util/keys.js"
import keysAll from "../util/keys-all.js"
import maskFunction from "../util/mask-function.js"
import realConsole from "../real/console.js"
import safeConsole from "../safe/console.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"
import toString from "../util/to-string.js"

function init() {
  const {
    ELECTRON_RENDERER,
    FLAGS
  } = ENV

  const RealConsole = realConsole.Console
  const realProto = RealConsole.prototype
  const realProtoNames = keysAll(realProto)

  const builtinLog = wrapBuiltin(realProto.log)
  const dirOptions = { customInspect: true }

  // Assign `console` to a variable so it's not removed by
  // `babel-plugin-transform-remove-console`.
  const globalConsole = console

  const wrapperMap = new Map([
    ["assert", wrapBuiltin(realProto.assert, assertWrapper)],
    ["debug", builtinLog],
    ["dir", wrapBuiltin(realProto.dir, dirWrapper)],
    ["dirxml", builtinLog],
    ["info", builtinLog],
    ["log", builtinLog],
    ["trace", wrapBuiltin(realProto.trace)],
    ["warn", wrapBuiltin(realProto.warn)]
  ])

  let isConsoleSymbol = findByRegExp(Object.getOwnPropertySymbols(safeConsole), /IsConsole/i)

  if (isConsoleSymbol === void 0) {
    isConsoleSymbol = Symbol("kIsConsole")
  }

  function assertWrapper(func, [expression, ...rest]) {
    return Reflect.apply(func, this, [expression, ...transform(rest, toCustomInspectable)])
  }

  function dirWrapper(func, [object, options]) {
    return Reflect.apply(func, this, [{
      [shared.customInspectKey](recurseTimes, context) {
        const contextAsOptions = assign({}, context, options)

        contextAsOptions.customInspect = has(options, "customInspect")
          ? options.customInspect
          : false

        contextAsOptions.depth = recurseTimes
        return builtinUtil.inspect(object, contextAsOptions)
      }
    }, dirOptions])
  }

  function defaultWrapper(func, args) {
    return Reflect.apply(func, this, transform(args, toCustomInspectable))
  }

  function findByRegExp(array, regexp) {
    for (const value of array) {
      if (regexp.test(toString(value))) {
        return value
      }
    }
  }

  function toCustomInspectable(value) {
    if (! isObjectLike(value)) {
      return value
    }

    return {
      [shared.customInspectKey](recurseTimes, context) {
        const contextAsOptions = assign({}, context)

        contextAsOptions.depth = recurseTimes
        return builtinUtil.inspect(value, contextAsOptions)
      }
    }
  }

  function transform(array, iteratee) {
    const { length } = array

    let i = -1

    while (++i < length) {
      array[i] = iteratee(array[i])
    }

    return array
  }

  function wrapBuiltin(builtinFunc, wrapper = defaultWrapper) {
    return maskFunction(function (...args) {
      const { customInspect } = defaultInspectOptions

      defaultInspectOptions.customInspect = true

      try {
        return Reflect.apply(wrapper, this, [builtinFunc, args])
      } finally {
        defaultInspectOptions.customInspect = customInspect
      }
    }, builtinFunc)
  }

  const Console = maskFunction(function (...args) {
    const newTarget = new.target

    if (newTarget === void 0) {
      return Reflect.construct(Console, args)
    }

    this[isConsoleSymbol] = true

    const { prototype } = Console
    const protoNames = keys(prototype)

    for (const name of protoNames) {
      const value = this[name]

      if (typeof value === "function") {
        this[name] = GenericFunction.bind(value, this)
      }
    }

    const result = Reflect.construct(RealConsole, args, newTarget)
    const resultNames = keysAll(result)

    for (const name of resultNames) {
      if (! Reflect.has(this, name)) {
        copyProperty(this, result, name)
      }
    }
  }, RealConsole)

  const { prototype } = Console

  for (const name of realProtoNames) {
    const value = wrapperMap.get(name)

    if (value !== void 0) {
      prototype[name] = value
    } else if (name !== "constructor") {
      copyProperty(prototype, realProto, name)
    }
  }

  const builtinConsole = new Console(stdout, stderr)

  for (const name of realProtoNames) {
    if (! has(builtinConsole, name)) {
      copyProperty(builtinConsole, prototype, name)
    }
  }

  Reflect.setPrototypeOf(builtinConsole, GenericObject.create())

  if (config.variables.v8_enable_inspector &&
      FLAGS.inspect) {
    const { consoleCall } = binding.inspector

    if (typeof consoleCall === "function") {
      const builtinNames = keys(builtinConsole)
      const emptyConfig = {}

      for (const name of builtinNames) {
        const builtinFunc = builtinConsole[name]

        setDeferred(builtinConsole, name, () => {
          const { originalConsole } = shared
          const originalFunc = originalConsole[name]

          if (typeof builtinFunc !== "function" ||
              typeof originalFunc !== "function" ||
              ! has(originalConsole, name)) {
            return builtinFunc
          }

          return GenericFunction.bind(
            consoleCall,
            void 0,
            originalFunc,
            builtinFunc,
            emptyConfig
          )
        })
      }
    }
  } else if (ELECTRON_RENDERER) {
    const globalNames = keys(globalConsole)

    for (const name of globalNames) {
      if (name !== "Console" &&
          has(builtinConsole, name)) {
        // eslint-disable-next-line no-console
        const consoleFunc = globalConsole[name]
        const builtinFunc = builtinConsole[name]

        if (typeof builtinFunc === "function" &&
            typeof consoleFunc === "function") {
          builtinConsole[name] = consoleFunc
        }
      }
    }
  }

  const safeNames = keysAll(safeConsole)

  for (const name of safeNames) {
    if (name === "Console") {
      builtinConsole.Console = Console
    } else if (! has(builtinConsole, name)) {
      copyProperty(builtinConsole, safeConsole, name)
    }
  }

  if (!  has(Console, Symbol.hasInstance)) {
    Reflect.defineProperty(Console, Symbol.hasInstance, {
      value: (instance) => instance[isConsoleSymbol]
    })
  }

  const builtinMethodMap = new Map([
    [globalConsole.assert, builtinConsole.assert],
    [globalConsole.debug, builtinConsole.debug],
    [globalConsole.dir, builtinConsole.dir],
    [globalConsole.dirxml, builtinConsole.dirxml],
    [globalConsole.info, builtinConsole.info],
    [globalConsole.log, builtinConsole.log],
    [globalConsole.trace, builtinConsole.trace],
    [globalConsole.warn, builtinConsole.warn]
  ])

  const proxy = new OwnProxy(globalConsole, {
    get(globalConsole, name, receiver) {
      const value = Reflect.get(globalConsole, name, receiver)
      const builtinMethod = builtinMethodMap.get(value)

      return builtinMethod === void 0
        ? value
        : builtinMethod
    },

    getOwnPropertyDescriptor(globalConsole, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(globalConsole, name)

      if (isUpdatableDescriptor(descriptor)) {
        const { value } = descriptor
        const builtinMethod = builtinMethodMap.get(value)

        if (builtinMethod !== void 0) {
          descriptor.value = builtinMethod
        }
      }

      return descriptor
    }
  })

  return proxy
}

export default shared.inited
  ? shared.module.builtinConsole
  : shared.module.builtinConsole = init()
