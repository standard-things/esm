import matches from "../util/matches.js"
import shared from "../shared.js"

function isInspect() {
  const { env } = shared

  return Reflect.has(env, "inspect")
    ? env.inspect
    : env.inspect = matches(process.execArgv, /^--(?:debug|inspect)(?:-brk)?$/)
}

export default isInspect
