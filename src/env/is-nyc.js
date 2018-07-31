import has from "../util/has.js"
import { env as processEnv } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isNyc() {
    const { env } = shared

    return Reflect.has(env, "nyc")
      ? env.nyc
      : env.nyc = has(processEnv, "NYC_ROOT_ID")
  }

  return isNyc
}

export default shared.inited
  ? shared.module.envIsNyc
  : shared.module.envIsNyc = init()
