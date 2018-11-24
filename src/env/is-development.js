import { env } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isDevelopment() {
    return env.NODE_ENV === "development"
  }

  return isDevelopment
}

export default shared.inited
  ? shared.module.envIsDevelopment
  : shared.module.envIsDevelopment = init()
