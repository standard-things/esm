import shared from "../shared.js"

function init() {
  function alwaysFalse() {
    return false
  }

  return alwaysFalse
}

export default shared.inited
  ? shared.module.utilAlwaysFalse
  : shared.module.utilAlwaysFalse = init()
