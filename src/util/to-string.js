import shared from "../shared.js"

function init() {
  function toString(value) {
    if (typeof value === "string") {
      return value
    }

    try {
      return String(value)
    } catch (e) {}

    return ""
  }

  return toString
}

export default shared.inited
  ? shared.module.utilToString
  : shared.module.utilToString = init()
