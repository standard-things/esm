import matches from "../util/matches.js"
import shared from "../shared.js"

function isInspect() {
  const { env } = shared

  return "inspect" in env
    ? env.inspect
    : env.inspect = matches(process.execArgv, /^--(?:debug|inspect)(?:-brk)?$/)
}

export default isInspect
