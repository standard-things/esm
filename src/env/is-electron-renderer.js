import isElectron from "./is-electron.js"
import shared from "../shared.js"
import { type } from "../safe/process.js"

function isElectronRenderer() {
  const { env } = shared

  if (Reflect.has(env, "electronRenderer")) {
    return env.electronRenderer
  }

  return env.electronRenderer =
    isElectron() &&
    (type === "renderer" ||
     shared.unsafeGlobal.process === void 0)
}

export default isElectronRenderer
