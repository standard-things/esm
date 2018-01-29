import matches from "../util/matches.js"
import shared from "../shared.js"

function isInspect() {
  return "isInspect" in shared.env
    ? shared.env.isInspect
    : shared.env.isInspect = matches(process.execArgv, /^--(?:debug|inspect)(?:-brk)?$/)
}

export default isInspect
