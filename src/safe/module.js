import RealModule from "../real/module.js"

import safe from "../util/safe.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.SafeModule
  : shared.module.SafeModule = safe(RealModule)
