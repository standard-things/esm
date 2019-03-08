import isNativeLike from "./is-native-like.js"
import isProxy from "./is-proxy.js"
import shared from "../shared.js"

function init() {

  function isNative(func) {
    if (! isNativeLike(func)) {
      return false
    }

    const { name } = func

    // Section 19.2.3.2: Function#bind()
    // Step 11: Bound function names start with "bound ".
    // https://tc39.github.io/ecma262/#sec-function.prototype.bind
    if (typeof name === "string" &&
        name.startsWith("bound ")) {
      return false
    }

    return ! isProxy(func)
  }

  return isNative
}

export default shared.inited
  ? shared.module.utilIsNative
  : shared.module.utilIsNative = init()
