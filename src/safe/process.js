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

  const { config } = safeProcess

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

  setProperty(safeProcess, "argv", safe(safeProcess.argv))
  setProperty(safeProcess, "config", safeConfig)
  setProperty(safeProcess, "dlopen", GenericFunction.bind(safeProcess.dlopen, realProcess))
  setProperty(safeProcess, "emitWarning", GenericFunction.bind(safeProcess.emitWarning, realProcess))
  setProperty(safeProcess, "env", safe(safeProcess.env))
  setProperty(safeProcess, "execArgv", safe(safeProcess.execArgv))
  setProperty(safeProcess, "getMaxListeners", GenericFunction.bind(realProcess.getMaxListeners, realProcess))
  setProperty(safeProcess, "once", GenericFunction.bind(realProcess.once, realProcess))
  setProperty(safeProcess, "setMaxListeners", GenericFunction.bind(realProcess.setMaxListeners, realProcess))
  setProperty(safeProcess, "versions", safe(safeProcess.versions))

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
  emitWarning,
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
