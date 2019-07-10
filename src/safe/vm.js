import allKeys from "../util/all-keys.js"
import copyProperty from "../util/copy-property.js"
import getPrototypeOf from "../util/get-prototype-of.js"
import has from "../util/has.js"
import realVM from "../real/vm.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import setPrototypeOf from "../util/set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const safeVM = safe(realVM)
  const { Script } = safeVM
  const SafeScript = safe(Script)
  const SafeProto = SafeScript.prototype

  const contextifyProto = getPrototypeOf(Script.prototype)
  const names = allKeys(contextifyProto)

  for (const name of names) {
    if (! has(SafeProto, name)) {
      copyProperty(SafeProto, contextifyProto, name)
    }
  }

  setPrototypeOf(SafeProto, contextifyProto)

  setProperty(safeVM, "Script", SafeScript)

  return safeVM
}

const safeVM = shared.inited
  ? shared.module.safeVM
  : shared.module.safeVM = init()

export const {
  Script
} = safeVM

export default safeVM
