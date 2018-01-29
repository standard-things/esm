import isFromRequireFlag from "./is-from-require-flag.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isCheck() {
  if ("isCheck" in shared.env) {
    return shared.env.isCheck
  }

  return shared.env.isCheck =
    process.argv.length < 2 &&
    isFromRequireFlag() &&
    matches(process.execArgv, /^(?:--check|-c)$/)
}

export default isCheck

