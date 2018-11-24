import isElectron from "./is-electron.js"
import shared from "../shared.js"
import { type } from "../safe/process.js"

function init() {
  function isElectronRenderer() {
    return type === "renderer" &&
      isElectron()
  }

  return isElectronRenderer
}

export default shared.inited
  ? shared.module.envIsElectronRenderer
  : shared.module.envIsElectronRenderer = init()
