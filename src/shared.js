
import FastObject from "./fast-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"

const shared = assign(new FastObject, __shared__)

if (! __shared__) {
  shared.entry = new SafeWeakMap
  shared.findPath = new FastObject
  shared.inited = false
  shared.maxSatisfying = new FastObject
  shared.package = new FastObject
  shared.parseURL = new FastObject
  shared.pkgInfo = new FastObject
}

export default shared
