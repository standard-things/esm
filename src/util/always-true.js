import shared from "../shared.js"

function init() {
  function alwaysTrue() {
    return true
  }

  return alwaysTrue
}

export default shared.inited
  ? shared.module.utilAlwaysTrue
  : shared.module.utilAlwaysTrue = init()
