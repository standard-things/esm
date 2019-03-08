import isNativeLike from "./is-native-like.js"
import shared from "../shared.js"

function init() {
  function isBound(func) {
    if (! isNativeLike(func)) {
      return false
    }

    const { name } = func

    // Section 19.2.3.2: Function#bind()
    // Step 11: Bound function names start with "bound ".
    // https://tc39.github.io/ecma262/#sec-function.prototype.bind
    return typeof name === "string" &&
           name.startsWith("bound ")
  }

  return isBound
}

export default shared.inited
  ? shared.module.utilIsBound
  : shared.module.utilIsBound = init()
