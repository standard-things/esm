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
import isUpdatableGet from "../util/is-updatable-get.js"
import keys from "../util/keys.js"
import ownKeys from "../util/own-keys.js"
import maskFunction from "../util/mask-function.js"
import realConsole from "../real/console.js"
import safeConsole from "../safe/console.js"
import safeProcess from "../safe/process.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"
import toString from "../util/to-string.js"

function init() {
  const {
    ELECTRON_RENDERER,
    FLAGS,
    HAS_INSPECTOR
  } = ENV

  const RealConsole = realConsole.Console
  const RealProto = RealConsole.prototype
  const RealProtoNames = ownKeys(RealProto)

  const builtinLog = wrapBuiltin(RealProto.log)
  const dirOptions = { customInspect: true }
  const safeConsoleSymbols = Object.getOwnPropertySymbols(safeConsole)

  // Assign `console` to a variable so it's not removed by
  // `babel-plugin-transform-remove-console`.
  const globalConsole = console

  const wrapperMap = new Map([
    ["assert", wrapBuiltin(RealProto.assert, assertWrapper)],
    ["debug", builtinLog],
    ["dir", wrapBuiltin(RealProto.dir, dirWrapper)],
    ["dirxml", builtinLog],
    ["info", builtinLog],
    ["log", builtinLog],
    ["trace", wrapBuiltin(RealProto.trace)],
    ["warn", wrapBuiltin(RealProto.warn)]
  ])

  let isConsoleSymbol = findByRegExp(safeConsoleSymbols, /IsConsole/i)

  if (typeof isConsoleSymbol !== "symbol") {
    isConsoleSymbol = Symbol("kIsConsole")
  }

  function assertWrapper(func, [expression, ...rest]) {
    return Reflect.apply(func, this, [expression, ...transform(rest, toCustomInspectable)])
  }

  function createBuiltinConsole() {
    const builtinConsole = tryCreateConsole(safeProcess)

    if (builtinConsole === null) {
      return realConsole
    }

    if (HAS_INSPECTOR &&
        FLAGS.inspect) {
      const { consoleCall } = binding.inspector
      const useConsoleCall = typeof consoleCall === "function"

      const { originalConsole } = shared
      const originalNames = keys(originalConsole)
      const emptyConfig = useConsoleCall ? {} : null

      for (const name of originalNames) {
        if (! isKeyAssignable(name)) {
          continue
        }

        const originalFunc = originalConsole[name]

        if (typeof originalFunc === "function") {
          const builtinFunc = builtinConsole[name]

          if (useConsoleCall &&
              typeof builtinFunc === "function" &&
              has(builtinConsole, name)) {
            setDeferred(builtinConsole, name, () => {
              // Use `consoleCall()` to combine `builtinFunc()` and
              // `originalFunc()` without adding to the call stack.
              return GenericFunction.bind(
                consoleCall,
                void 0,
                originalFunc,
                builtinFunc,
                emptyConfig
              )
            })
          } else {
            builtinConsole[name] = originalFunc
          }
        }
      }
    } else if (ELECTRON_RENDERER) {
      const globalNames = keys(globalConsole)

      for (const name of globalNames) {
        if (! isKeyAssignable(name)) {
          continue
        }

        const consoleFunc = globalConsole[name]

        if (typeof consoleFunc === "function") {
          builtinConsole[name] = consoleFunc
        }
      }
    }

    const safeNames = ownKeys(safeConsole)

    for (const name of safeNames) {
      if (name === "Console") {
        builtinConsole.Console = Console
      } else if (isKeyAssignable(name) &&
          ! has(builtinConsole, name)) {
        copyProperty(builtinConsole, safeConsole, name)
      }
    }

    if (! has(Console, Symbol.hasInstance)) {
      Reflect.defineProperty(Console, Symbol.hasInstance, {
        value: (instance) => instance[isConsoleSymbol]
      })
    }

    return builtinConsole
  }

  function createBuiltinMethodMap(builtinConsole) {
    return new Map([
      [globalConsole.assert, builtinConsole.assert],
      [globalConsole.debug, builtinConsole.debug],
      [globalConsole.dir, builtinConsole.dir],
      [globalConsole.dirxml, builtinConsole.dirxml],
      [globalConsole.info, builtinConsole.info],
      [globalConsole.log, builtinConsole.log],
      [globalConsole.trace, builtinConsole.trace],
      [globalConsole.warn, builtinConsole.warn]
    ])
  }

  function createConsole({ stderr, stdout }) {
    const args = RealConsole.length === 2
      ? [stdout, stderr]
      : [{ stderr, stdout }]

    const newConsole = Reflect.construct(Console, args)
    const { prototype } = Console

    for (const name of RealProtoNames) {
      if (isKeyAssignable(name) &&
          ! has(newConsole, name)) {
        copyProperty(newConsole, prototype, name)
      }
    }

    Reflect.setPrototypeOf(newConsole, GenericObject.create())

    return newConsole
  }

  function defaultWrapper(func, args) {
    return Reflect.apply(func, this, transform(args, toCustomInspectable))
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

  function findByRegExp(array, regexp) {
    for (const value of array) {
      if (regexp.test(toString(value))) {
        return value
      }
    }
  }

  function isKeyAssignable(name) {
    return name !== "Console" &&
      name !== "constructor"
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

  function tryCreateConsole(processObject) {
    try {
      return createConsole(processObject)
    } catch {}

    return null
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
    const resultNames = ownKeys(result)

    for (const name of resultNames) {
      if (! Reflect.has(this, name)) {
        copyProperty(this, result, name)
      }
    }
  }, RealConsole)

  const { prototype } = Console

  for (const name of RealProtoNames) {
    if (! isKeyAssignable(name)) {
      continue
    }

    const wrapped = wrapperMap.get(name)

    if (wrapped !== void 0) {
      const descriptor = Reflect.getOwnPropertyDescriptor(RealProto, name)

      Reflect.defineProperty(prototype, name, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        value: wrapped,
        writable: descriptor.writable
      })
    } else {
      copyProperty(prototype, RealProto, name)
    }
  }

  let builtinConsole
  let builtinMethodMap

  const proxy = new OwnProxy(globalConsole, {
    get(globalConsole, name, receiver) {
      if (receiver === proxy) {
        receiver = globalConsole
      }

      const value = Reflect.get(globalConsole, name, receiver)

      if (isUpdatableGet(globalConsole, name)) {
        if (builtinConsole === void 0) {
          builtinConsole = createBuiltinConsole()
          builtinMethodMap = createBuiltinMethodMap(builtinConsole)
        }

        const builtinMethod = builtinMethodMap.get(value)

        if (builtinMethod !== void 0) {
          return builtinMethod
        }
      }

      return value
    },
    getOwnPropertyDescriptor(globalConsole, name) {
      const descriptor = Reflect.getOwnPropertyDescriptor(globalConsole, name)

      if (isUpdatableDescriptor(descriptor)) {
        if (builtinConsole === void 0) {
          builtinConsole = createBuiltinConsole()
          builtinMethodMap = createBuiltinMethodMap(builtinConsole)
        }

        const builtinMethod = builtinMethodMap.get(descriptor.value)

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
