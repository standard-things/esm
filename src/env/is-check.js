import isFromRequireFlag from "./is-from-require-flag.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function isCheck() {
  const { env } = shared

  if ("isCheck" in env) {
    return env.isCheck
  }

  return env.isCheck =
    process.argv.length === 1 &&
    matches(process.execArgv, /^(?:--check|-c)$/) &&
    isFromRequireFlag()
}

export default isCheck

