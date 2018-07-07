import { config, stderr, stdout } from "../safe/process.js"

import ENV from "../constant/env.js"

import GenericFunction from "../generic/function.js"

import assign from "../util/assign.js"
import binding from "../binding.js"
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

  const RealConsole = realConsole.Console

  const realMethodNames = []
  const realProto = RealConsole.prototype
  const realProtoNames = keysAll(realProto)

  const builtinLog = wrap(realProto.log)
  const dirOptions = { customInspect: true }

  const wrapperMap = {
    __proto__: null,
    assert: wrap(realProto.assert, assertWrapper),
    debug: builtinLog,
    dir: wrap(realProto.dir, dirWrapper),
    dirxml: builtinLog,
    info: builtinLog,
    log: builtinLog,
    trace: wrap(realProto.trace),
    warn: wrap(realProto.warn)
  }

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

  const Console = maskFunction(function (...args) {
    const target = new.target

    if (target) {
      for (const name of realMethodNames) {
        const value = this[name]

        if (typeof value === "function") {
          this[name] = GenericFunction.bind(value, this)
        }
      }

      const result = Reflect.construct(RealConsole, args, target)
      const names = keysAll(result)

      for (const name of names) {
        if (! Reflect.has(this, name)) {
          copyProperty(this, result, name)
        }
      }
    } else {
      return Reflect.construct(Console, args)
    }
  }, RealConsole)

  const { prototype } = Console

  for (const name of realProtoNames) {
    if (typeof name === "string" &&
        typeof realProto[name] === "function") {
      realMethodNames.push(name)
    }

    if (Reflect.has(wrapperMap, name)) {
      prototype[name] = wrapperMap[name]
    } else {
      copyProperty(prototype, realProto, name)
    }
  }

  const builtinConsole = new Console(stdout, stderr)

  if (INSPECT &&
      config.variables.v8_enable_inspector) {
    const { consoleCall } = binding.inspector

    if (typeof consoleCall === "function") {
      const emptyConfig = { __proto__: null }

      for (const name in wrapperMap) {
        // eslint-disable-next-line no-console
        const value = console[name]

        if (typeof value === "function") {
          builtinConsole[name] = GenericFunction.bind(
            consoleCall,
            void 0,
            value,
            builtinConsole[name],
            emptyConfig
          )
        }
      }
    }
  } else if (ELECTRON_RENDERER) {
    const names = keysAll(console)

    for (const name of names) {
      if (name !== "Console") {
        copyProperty(builtinConsole, console, name)
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
