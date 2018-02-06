import binding from "./binding.js"
import { satisfies } from "semver"
import shared from "./shared.js"

function init() {
  return satisfies(process.version, "<7.0.0")
    ? "string"
    : typeof binding.util.arrow_message_private_symbol
}

export default shared.inited
  ? shared.hiddenKeyType
  : init()

