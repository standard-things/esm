import { stderr, stdout } from "../safe/process.js"

import { Console } from "../safe/console.js"

import assign from "../util/assign.js"
import builtinUtil from "./util.js"
import { defaultInspectOptions } from "../safe/util.js"
import has from "../util/has.js"
import maskFunction from "../util/mask-function.js"
import shared from "../shared.js"

function init() {
  const dirOptions = { customInspect: true }

  function defaultWrapper(func, args) {
    return func(toInspectableArgs(args))
  }

  function toInspectable(value) {
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
        return wrapper(func, args)
      } finally {
        defaultInspectOptions.customInspect = customInspect
      }
    }, func)
  }

  const builtinConsole = new Console(stdout, stderr)

  builtinConsole.assert = wrap(builtinConsole.assert, (func, args) => {
    const [expression, ...rest] = args

    return func(expression, toInspectableArgs(rest))
  })

  builtinConsole.dir = wrap(builtinConsole.dir, (func, args) => {
    const [object, options] = args

    return func({
      [shared.customInspectKey](recurseTimes, context) {
        const contextAsOptions = assign({}, context, options)

        contextAsOptions.customInspect = has(options, "customInspect")
          ? options.customInspect
          : false

        contextAsOptions.depth = recurseTimes
        return builtinUtil.inspect(object, contextAsOptions)
      }
    }, dirOptions)
  })

  builtinConsole.debug =
  builtinConsole.dirxml =
  builtinConsole.info =
  builtinConsole.log = wrap(builtinConsole.log)

  builtinConsole.warn = wrap(builtinConsole.warn)
  builtinConsole.trace = wrap(builtinConsole.trace)

  return builtinConsole
}

export default shared.inited
  ? shared.module.builtinConsole
  : shared.module.builtinConsole = init()
