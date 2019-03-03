import shared from "../shared.js"

function init() {
  return {}
}

export default shared.inited
  ? shared.module.utilEmptyObject
  : shared.module.utilEmptyObject = init()
