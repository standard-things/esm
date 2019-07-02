import isNativeLikeFunction from "./is-native-like-function.js"
import isProxy from "./is-proxy.js"
import shared from "../shared.js"

function init() {
  function isNativeFunction(value) {
    if (! isNativeLikeFunction(value)) {
      return false
    }

    const { name } = value

    // Section 19.2.3.2: Function#bind()
    // Step 11: Bound function names start with "bound ".
    // https://tc39.github.io/ecma262/#sec-function.prototype.bind
    if (typeof name === "string" &&
        name.startsWith("bound ")) {
      return false
    }

    return ! isProxy(value)
  }

  return isNativeFunction
}

export default shared.inited
  ? shared.module.utilIsNativeFunction
  : shared.module.utilIsNativeFunction = init()
