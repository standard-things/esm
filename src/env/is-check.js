import isFromRequireFlag from "./is-from-require-flag.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isCheck() {
  if ("isCheck" in shared.env) {
    return shared.env.isCheck
  }

  return shared.env.isCheck =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--check|-c)$/) &&
    isFromRequireFlag()
}

export default isCheck

