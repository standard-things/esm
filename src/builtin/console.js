import { config, stderr, stdout } from "../safe/process.js"

import ENV from "../constant/env.js"

import GenericFunction from "../generic/function.js"
import GenericObject from "../generic/object.js"

import assign from "../util/assign.js"
import binding from "../binding.js"
import builtinUtil from "./util.js"
import copyProperty from "../util/copy-property.js"
import { defaultInspectOptions } from "../safe/util.js"
import has from "../util/has.js"
import isObjectLike from "../util/is-object.js"
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

  const instanceRegExp = /IsConsole/i

  const instanceSymbol = Object
    .getOwnPropertySymbols(safeConsole)
    .find((symbol) => instanceRegExp.test(toString(symbol))) ||
    Symbol("kIsConsole")

  const builtinLog = wrapBuiltin(realProto.log)
  const dirOptions = { customInspect: true }

  const wrapperMap = {
    __proto__: null,
    assert: wrapBuiltin(realProto.assert, assertWrapper),
    debug: builtinLog,
    dir: wrapBuiltin(realProto.dir, dirWrapper),
    dirxml: builtinLog,
    info: builtinLog,
    log: builtinLog,
    trace: wrapBuiltin(realProto.trace),
    warn: wrapBuiltin(realProto.warn)
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
    const target = new.target

    if (! target) {
      return Reflect.construct(Console, args)
    }

    this[instanceSymbol] = true

    const { prototype } = Console
    const names = keys(prototype)

    for (const name of names) {
      const value = this[name]

      if (typeof value === "function") {
        this[name] = GenericFunction.bind(value, this)
      }
    }

    const result = Reflect.construct(RealConsole, args, target)
    const resultNames = keysAll(result)

    for (const name of resultNames) {
      if (! Reflect.has(this, name)) {
        copyProperty(this, result, name)
      }
    }
  }, RealConsole)

  const { prototype } = Console

  for (const name of realProtoNames) {
    if (Reflect.has(wrapperMap, name)) {
      prototype[name] = wrapperMap[name]
    } else {
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
      const emptyConfig = { __proto__: null }
      const names = keys(builtinConsole)

      for (const name of names) {
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
    // Assign `console` to a variable so it's not removed by
    // `babel-plugin-transform-remove-console`.
    const unmungedConsole = console
    const names = keys(unmungedConsole)

    for (const name of names) {
      if (name !== "Console" &&
          has(builtinConsole, name)) {
        // eslint-disable-next-line no-console
        const consoleFunc = unmungedConsole[name]
        const builtinFunc = builtinConsole[name]

        if (typeof builtinFunc === "function" &&
            typeof consoleFunc === "function") {
          builtinConsole[name] = consoleFunc
        }
      }
    }
  }

  const names = keysAll(safeConsole)

  for (const name of names) {
    if (name === "Console") {
      builtinConsole.Console = Console
    } else if (! has(builtinConsole, name)) {
      copyProperty(builtinConsole, safeConsole, name)
    }
  }

  if (!  has(Console, Symbol.hasInstance)) {
    Reflect.defineProperty(Console, Symbol.hasInstance, {
      value: (instance) => instance[instanceSymbol]
    })
  }

  return builtinConsole
}

export default shared.inited
  ? shared.module.builtinConsole
  : shared.module.builtinConsole = init()
