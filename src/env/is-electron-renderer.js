import isElectron from "./is-electron.js"
import shared from "../shared.js"
import { type } from "../safe/process.js"

function init() {
  function isElectronRenderer() {
    const { env } = shared

    if (Reflect.has(env, "electronRenderer")) {
      return env.electronRenderer
    }

    return env.electronRenderer =
      isElectron() &&
      type === "renderer"
  }

  return isElectronRenderer
}

export default shared.inited
  ? shared.module.envIsElectronRenderer
  : shared.module.envIsElectronRenderer = init()
