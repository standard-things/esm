import copyProperty from "../util/copy-property.js"
import has from "../util/has.js"
import keysAll from "../util/keys-all.js"
import realVM from "../real/vm.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeVM = safe(realVM)
  const { Script } = safeVM
  const contextifyProto = Reflect.getPrototypeOf(Script.prototype)

  setProperty(safeVM, "Script", safe(Script))

  const names = keysAll(contextifyProto)
  const { prototype } = safeVM.Script

  for (const name of names) {
    if (! has(prototype, name)) {
      copyProperty(prototype, contextifyProto, name)
    }
  }

  Reflect.setPrototypeOf(prototype, contextifyProto)
  return safeVM
}

const safeVM = shared.inited
  ? shared.module.safeVM
  : shared.module.safeVM = init()

export const {
  Script
} = safeVM

export default safeVM
