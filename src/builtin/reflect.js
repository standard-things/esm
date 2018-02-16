import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  return typeof Reflect === "object" && Reflect !== null
    ? safe(Reflect)
    : null
}

export default shared.inited
  ? shared.builtin.Reflect
  : shared.builtin.Reflect = init()
