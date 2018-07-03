import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isElectron() {
    const { env } = shared

    return Reflect.has(env, "electron")
      ? env.electron
      : env.electron = Reflect.has(versions, "electron")
  }

  return isElectron
}

export default shared.inited
  ? shared.module.envIsElectron
  : shared.module.envIsElectron = init()
