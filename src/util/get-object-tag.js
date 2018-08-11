import shared from "../shared.js"

function init() {
  const { toString } = Object.prototype

  function getObjectTag(value) {
    return toString.call(value)
  }

  return getObjectTag
}

export default shared.inited
  ? shared.module.utilGetToStringTag
  : shared.module.utilGetToStringTag = init()
