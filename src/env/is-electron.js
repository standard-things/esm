import safeProcess from "../safe/process.js"
import shared from "../shared.js"

function isElectron() {
  const { env } = shared

  return Reflect.has(env, "electron")
    ? env.electron
    : env.electron = "electron" in safeProcess.versions
}

export default isElectron
