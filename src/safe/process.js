import realProcess from "../real/process.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const safeProcess = safe(realProcess)

  safeProcess.env = safe(safeProcess.env)
  safeProcess.release = safe(safeProcess.release)
  safeProcess.versions = safe(safeProcess.versions)
  return safeProcess
}

export default shared.inited
  ? shared.module.safeProcess
  : shared.module.safeProcess = init()
