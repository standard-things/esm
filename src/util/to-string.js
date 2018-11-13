import shared from "../shared.js"

function init() {
  // Assign `String` to a variable so it's not removed by Terser.
  // https://github.com/terser-js/terser#the-unsafe-compress-option
  const UnmungedString = String

  function toString(value) {
    if (typeof value === "string") {
      return value
    }

    try {
      return UnmungedString(value)
    } catch {}

    return ""
  }

  return toString
}

export default shared.inited
  ? shared.module.utilToString
  : shared.module.utilToString = init()
