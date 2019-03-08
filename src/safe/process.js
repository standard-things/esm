import GenericFunction from "../generic/function.js"

import getSilent from "../util/get-silent.js"
import has from "../util/has.js"
import isObjectLike from "../util/is-object-like.js"
import noop from "../util/noop.js"
import realProcess from "../real/process.js"
import safe from "../util/safe.js"
import setDeferred from "../util/set-deferred.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeProcess = safe(realProcess)

  const {
    getMaxListeners,
    once,
    setMaxListeners
  } = realProcess

  const {
    argv,
    config,
    dlopen,
    env,
    execArgv,
    versions
  } = safeProcess

  const safeConfig = {
    variables: {
      v8_enable_inspector: 0
    }
  }

  if (isObjectLike(config) &&
      has(config, "variables") &&
      isObjectLike(config.variables) &&
      has(config.variables, "v8_enable_inspector") &&
      config.variables.v8_enable_inspector) {
    safeConfig.variables.v8_enable_inspector = 1
  }

  const bindingDescriptor = Reflect.getOwnPropertyDescriptor(safeProcess, "binding")

  setDeferred(safeProcess, "binding", () => {
    if (bindingDescriptor === void 0) {
      return noop
    }

    Reflect.defineProperty(safeProcess, "binding", bindingDescriptor)

    const binding = getSilent(safeProcess, "binding")

    const wrapper = typeof binding === "function"
      ? GenericFunction.bind(binding, realProcess)
      : noop

    setProperty(safeProcess, "binding", wrapper)

    return wrapper
  })

  setProperty(safeProcess, "argv", safe(argv))
  setProperty(safeProcess, "config", safeConfig)
  setProperty(safeProcess, "dlopen", GenericFunction.bind(dlopen, realProcess))
  setProperty(safeProcess, "env", safe(env))
  setProperty(safeProcess, "execArgv", safe(execArgv))
  setProperty(safeProcess, "getMaxListeners", GenericFunction.bind(getMaxListeners, realProcess))
  setProperty(safeProcess, "once", GenericFunction.bind(once, realProcess))
  setProperty(safeProcess, "setMaxListeners", GenericFunction.bind(setMaxListeners, realProcess))
  setProperty(safeProcess, "versions", safe(versions))

  return safeProcess
}

const safeProcess = shared.inited
  ? shared.module.safeProcess
  : shared.module.safeProcess = init()

export const {
  argv,
  config,
  cwd,
  dlopen,
  env,
  execArgv,
  getMaxListeners,
  once,
  platform,
  setMaxListeners,
  stderr,
  stdin,
  stdout,
  type,
  version,
  versions
} = safeProcess

export default safeProcess
