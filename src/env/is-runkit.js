import has from "../util/has.js"
import { env as processEnv } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isRunkit() {
    const { env } = shared

    return Reflect.has(env, "runkit")
      ? env.runkit
      : env.runkit = has(processEnv, "RUNKIT_HOST")
  }

  return isRunkit
}

export default shared.inited
  ? shared.module.envIsRunkit
  : shared.module.envIsRunkit = init()
