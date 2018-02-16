import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  return typeof Proxy === "function"
    ? safe(Proxy)
    : null
}

export default shared.inited
  ? shared.builtin.Proxy
  : shared.builtin.Proxy = init()
