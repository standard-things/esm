import { stderr, stdout } from "../safe/process.js"

import GenericFunction from "../generic/function.js"

import assign from "../util/assign.js"
import builtinUtil from "./util.js"
import copyProperty from "../util/copy-property.js"
import { defaultInspectOptions } from "../safe/util.js"
import has from "../util/has.js"
import isObjectLike from "../util/is-object.js"
import keys from "../util/keys.js"
import keysAll from "../util/keys-all.js"
import maskFunction from "../util/mask-function.js"
import safeConsole from "../safe/console.js"
import shared from "../shared.js"

function init() {
  const dirOptions = { customInspect: true }

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

  const _Console = safeConsole.Console
  const _proto = _Console.prototype

  const Console = maskFunction(function (...args) {
    const proto = Console.prototype
    const result = new _Console(...args)

    Reflect.setPrototypeOf(result, proto)

    const names = keys(proto)

    for (const name of names) {
      const value = proto[name]

      if (typeof value === "function")  {
        result[name] = GenericFunction.bind(value, result)
      }
    }

    return result
  }, _Console)

  const builtinAssert = wrap(_proto.assert, function (func, args) {
    const [expression, ...rest] = args

    return Reflect.apply(func, this, [expression, ...toInspectableArgs(rest)])
  })

  const builtinDir = wrap(_proto.dir, function (func, args) {
    const [object, options] = args

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
  })

  const builtinLog = wrap(_proto.log)
  const builtinTrace = wrap(_proto.trace)
  const builtinWarn = wrap(_proto.warn)

  const proto = Console.prototype
  const protoNames = keysAll(_proto)

  for (const name of protoNames) {
    if (name === "assert") {
      proto.assert = builtinAssert
    } if (name === "debug" ||
        name === "dirxml" ||
        name === "info" ||
        name === "log") {
      proto[name] = builtinLog
    } else if (name === "dir") {
      proto.dir = builtinDir
    } else if (name === "trace") {
      proto.trace = builtinTrace
    } else if (name === "warn") {
      proto.warn = builtinWarn
    } else {
      copyProperty(proto, _proto, name)
    }
  }

  const builtinConsole = new Console(stdout, stderr)
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
