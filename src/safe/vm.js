import realVM from "../real/vm.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.safeVM
  : shared.module.safeVM = safe(realVM)
