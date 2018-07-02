import shared from "../shared.js"

function init() {
  function safeToString(value) {
    if (typeof value === "string") {
      return value
    }

    try {
      return String(value)
    } catch (e) {}

    return ""
  }

  return safeToString
}

export default shared.inited
  ? shared.module.utilSafeToString
  : shared.module.utilSafeToString = init()
