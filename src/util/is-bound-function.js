import isNativeLikeFunction from "./is-native-like-function.js"
import shared from "../shared.js"

function init() {
  function isBoundFunction(value) {
    if (! isNativeLikeFunction(value)) {
      return false
    }

    const { name } = value

    // Section 19.2.3.2: Function#bind()
    // Step 11: Bound function names start with "bound ".
    // https://tc39.github.io/ecma262/#sec-function.prototype.bind
    return typeof name === "string" &&
           name.startsWith("bound ")
  }

  return isBoundFunction
}

export default shared.inited
  ? shared.module.utilIsBoundFunction
  : shared.module.utilIsBoundFunction = init()
