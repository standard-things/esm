import shared from "../shared.js"
import { versions } from "../safe/process.js"

function isElectron() {
  const { env } = shared

  return Reflect.has(env, "electron")
    ? env.electron
    : env.electron = Reflect.has(versions, "electron")
}

export default isElectron
