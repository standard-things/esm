import CHAR from "../constant/char.js"

import shared from "../shared.js"

function init() {
  const {
    ZERO_WIDTH_JOINER
  } = CHAR

  const WITHOUT_TOKEN = ZERO_WIDTH_JOINER + "WITHOUT" + ZERO_WIDTH_JOINER

  function replaceWithout(string, without, replacer) {
    if (typeof string !== "string" ||
        typeof without !== "string") {
      return string
    }

    const result = replacer(string.replace(without, WITHOUT_TOKEN))

    return typeof result === "string"
      ? result.replace(WITHOUT_TOKEN, () => without)
      : string
  }

  return replaceWithout
}

export default shared.inited
  ? shared.module.utilReplaceWithout
  : shared.module.utilReplaceWithout = init()
