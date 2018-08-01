import has from "../util/has.js"
import isObject from "../util/is-object.js"
import realProcess from "../real/process.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeProcess = safe(realProcess)

  const {
    argv,
    config,
    env,
    execArgv,
    versions
  } = safeProcess

  const safeConfig = {
    variables: {
      v8_enable_inspector: 0
    }
  }

  if (isObject(config) &&
      isObject(config.variables) &&
      has(config.variables, "v8_enable_inspector")) {
    safeConfig.variables.v8_enable_inspector = config.variables.v8_enable_inspector
  }

  setProperty(safeProcess, "argv", safe(argv))
  setProperty(safeProcess, "config", safeConfig)
  setProperty(safeProcess, "env", safe(env))
  setProperty(safeProcess, "execArgv", safe(execArgv))
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
  env,
  execArgv,
  platform,
  stderr,
  stdout,
  type,
  version,
  versions
} = safeProcess

export default safeProcess
