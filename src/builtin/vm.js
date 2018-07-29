import GenericObject from "../generic/object.js"

import copyProperty from "../util/copy-property.js"
import keysAll from "../util/keys-all.js"
import safeVM from "../safe/vm.js"
import shared from "../shared.js"

function init() {
  const builtinVM = GenericObject.create()
  const names = keysAll(safeVM)

  for (const name of names) {
    if (name !== "Module" &&
        name !== "SourceTextModule") {
      copyProperty(builtinVM, safeVM, name)
    }
  }

  return builtinVM
}

export default shared.inited
  ? shared.module.builtinVM
  : shared.module.builtinVM = init()
