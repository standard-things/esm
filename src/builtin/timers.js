import GenericObject from "../generic/object.js"

import assignProperties from "../util/assign-properties.js"
import safeTimers from "../safe/timers.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.builtinTimers
  : shared.module.builtinTimers = assignProperties(GenericObject.create(), safeTimers)
