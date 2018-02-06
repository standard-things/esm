import matches from "../util/matches.js"
import shared from "../shared.js"

function isInspect() {
  const { env } = shared

  return "isInspect" in env
    ? env.isInspect
    : env.isInspect = matches(process.execArgv, /^--(?:debug|inspect)(?:-brk)?$/)
}

export default isInspect
