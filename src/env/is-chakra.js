import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isChakra() {
    const { env } = shared

    return Reflect.has(env, "chakra")
      ? env.chakra
      : env.chakra = Reflect.has(versions, "chakracore")
  }

  return isChakra
}

export default shared.inited
  ? shared.module.envIsChakra
  : shared.module.envIsChakra = init()
