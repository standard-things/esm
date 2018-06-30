import { stderr, stdout } from "../safe/process.js"

import ENV from "../constant/env.js"

import assign from "../util/assign.js"
import builtinUtil from "./util.js"
import copyProperty from "../util/copy-property.js"
import { defaultInspectOptions } from "../safe/util.js"
import has from "../util/has.js"
import isObjectLike from "../util/is-object.js"
import keysAll from "../util/keys-all.js"
import maskFunction from "../util/mask-function.js"
import realConsole from "../real/console.js"
import safeConsole from "../safe/console.js"
import shared from "../shared.js"

function init() {
  const {
    ELECTRON_RENDERER,
    INSPECT
  } = ENV

  const dirOptions = { customInspect: true }

  function assertWrapper(func, [expression, ...rest]) {
    return Reflect.apply(func, this, [expression, ...toInspectableArgs(rest)])
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
    return Reflect.apply(func, this, toInspectableArgs(args))
  }

  function toInspectable(value) {
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

  function toInspectableArgs(args) {
    const { length } = args

    let i = -1

    while (++i < length) {
      args[i] = toInspectable(args[i])
    }

    return args
  }

  function wrap(func, wrapper = defaultWrapper) {
    return maskFunction(function (...args) {
      const { customInspect } = defaultInspectOptions

      defaultInspectOptions.customInspect = true

      try {
        return Reflect.apply(wrapper, this, [func, args])
      } finally {
        defaultInspectOptions.customInspect = customInspect
      }
    }, func)
  }

  const SafeConsole = safeConsole.Console

  const Console = maskFunction(function (...args) {
    const target = new.target

    if (target) {
      const result = Reflect.construct(SafeConsole, args, target)

      Reflect.setPrototypeOf(result, Reflect.getPrototypeOf(this))
      return result
    }

    return new Console(...args)
  }, SafeConsole)

  const safeProto = SafeConsole.prototype

  const builtinAssert = wrap(safeProto.assert, assertWrapper)
  const builtinDir = wrap(safeProto.dir, dirWrapper)
  const builtinLog = wrap(safeProto.log)
  const builtinTrace = wrap(safeProto.trace)
  const builtinWarn = wrap(safeProto.warn)

  const protoNames = keysAll(safeProto)
  const { prototype } = Console

  for (const name of protoNames) {
    if (name === "assert") {
      prototype.assert = builtinAssert
    } if (name === "debug" ||
        name === "dirxml" ||
        name === "info" ||
        name === "log") {
      prototype[name] = builtinLog
    } else if (name === "dir") {
      prototype.dir = builtinDir
    } else if (name === "trace") {
      prototype.trace = builtinTrace
    } else if (name === "warn") {
      prototype.warn = builtinWarn
    } else {
      copyProperty(prototype, safeProto, name)
    }
  }

  const builtinConsole = new Console(stdout, stderr)

  if (ELECTRON_RENDERER ||
      INSPECT) {
    const names = keysAll(realConsole)

    for (const name of names) {
      if (name !== "Console") {
        copyProperty(builtinConsole, realConsole, name)
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

  return builtinConsole
}

export default shared.inited
  ? shared.module.builtinConsole
  : shared.module.builtinConsole = init()
