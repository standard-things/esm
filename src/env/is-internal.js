import shared from "../shared.js"

function init() {
  function isInternal() {
    return __non_webpack_module__.id.startsWith("internal/")
  }

  return isInternal
}

export default shared.inited
  ? shared.module.envIsInternal
  : shared.module.envIsInternal = init()
