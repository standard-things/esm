import { platform } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isWin32() {
    return platform === "win32"
  }

  return isWin32
}

export default shared.inited
  ? shared.module.envIsWin32
  : shared.module.envIsWin32 = init()
