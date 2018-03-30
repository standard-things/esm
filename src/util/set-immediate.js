import binding from "../binding.js"
import shared from "../shared.js"

function init() {
  const _setImmediate = binding.timers.setImmediate

  return typeof _setImmediate === "function"
    ? _setImmediate
    : setImmediate
}

export default shared.inited
  ? shared.module.utilSetImmediate
  : shared.module.utilSetImmediate = init()
