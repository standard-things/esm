import realProcess from "../real/process.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeProcess = safe(realProcess)
  const { env, release, versions } = safeProcess

  setProperty(safeProcess, "env", safe(env))
  setProperty(safeProcess, "release", safe(release))
  setProperty(safeProcess, "versions", safe(versions))
  return safeProcess
}

const safeProcess = shared.inited
  ? shared.module.safeProcess
  : shared.module.safeProcess = init()

export const {
  argv,
  cwd,
  env,
  execArgv,
  release,
  pid,
  platform,
  stderr,
  stdout,
  type,
  version,
  versions
} = safeProcess

export default safeProcess
