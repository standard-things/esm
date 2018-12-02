import GenericObject from "../generic/object.js"

import copyProperty from "../util/copy-property.js"
import ownKeys from "../util/own-keys.js"
import safeVM from "../safe/vm.js"
import shared from "../shared.js"

function init() {
  const builtinVM = GenericObject.create()
  const names = ownKeys(safeVM)

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
