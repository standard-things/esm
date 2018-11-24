import isBrave from "./is-brave.js"
import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isElectron() {
    return Reflect.has(versions, "electron") ||
      isBrave()
  }

  return isElectron
}

export default shared.inited
  ? shared.module.envIsElectron
  : shared.module.envIsElectron = init()
