import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isBrave() {
    const { env } = shared

    return Reflect.has(env, "brave")
      ? env.brave
      : env.brave = Reflect.has(versions, "Brave")
  }

  return isBrave
}

export default shared.inited
  ? shared.module.envIsBrave
  : shared.module.envIsBrave = init()
