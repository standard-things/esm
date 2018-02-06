
import FastObject from "./fast-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"
import encodeId from "./util/encode-id.js"
import md5 from "./util/md5.js"

const { now } = Date

const shared = assign(new FastObject, __shared__)

if (! __shared__) {
  shared.entry = new SafeWeakMap
  shared.env = new FastObject
  shared.findPath = new FastObject
  shared.global = global
  shared.globalName = encodeId("_" + md5(now().toString()).slice(0, 3))
  shared.inited = false
  shared.maxSatisfying = new FastObject
  shared.package = new FastObject
  shared.packageCache = new FastObject
  shared.parseURL = new FastObject
  shared.pendingMetas = new FastObject
  shared.pendingWrites = new FastObject
  shared.resolveFilename = new FastObject
}

export default shared
