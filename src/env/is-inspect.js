import { execArgv } from "../safe/process.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function init() {
  function isInspect() {
    const { env } = shared

    return Reflect.has(env, "inspect")
      ? env.inspect
      : env.inspect = matches(execArgv, /^--(?:debug|inspect)(?:-brk)?(?:=.*)?$/)
  }

  return isInspect
}

export default shared.inited
  ? shared.module.envIsInspect
  : shared.module.envIsInspect = init()
