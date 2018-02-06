
import FastObject from "./fast-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"
import binding from "./binding.js"
import encodeId from "./util/encode-id.js"
import md5 from "./util/md5.js"
import { satisfies } from "semver"
import setDeferred from "./util/set-deferred.js"

const { now } = Date

const nodeVersion = process.version
const shared = assign(new FastObject, __shared__)

if (! __shared__) {
  const fastPath = new FastObject
  const globalName = encodeId("_" + md5(now().toString()).slice(0, 3))
  const support = new FastObject

  shared.binding = binding
  shared.entry = new SafeWeakMap
  shared.env = new FastObject
  shared.fastPath = fastPath
  shared.findPath = new FastObject
  shared.global = global
  shared.globalName = globalName
  shared.inited = false
  shared.maxSatisfying = new FastObject
  shared.package = new FastObject
  shared.packageCache = new FastObject
  shared.parseURL = new FastObject
  shared.pendingMetas = new FastObject
  shared.pendingWrites = new FastObject
  shared.resolveFilename = new FastObject
  shared.support = support

  fastPath.gunzip = true
  fastPath.gzip = true

  setDeferred(fastPath, "mtime", () => {
    return typeof binding.fs.stat === "function" &&
      satisfies(nodeVersion, "^6.10.1||>=7.7")
  })

  setDeferred(fastPath, "readFile", () => {
    return support.internalModuleReadFile
  })

  setDeferred(fastPath, "readFileFast", () => {
    return support.internalModuleReadJSON || support.internalModuleReadFile
  })

  setDeferred(fastPath, "stat", () => {
    return typeof binding.fs.internalModuleStat === "function"
  })

  setDeferred(shared, "hiddenKeyType", () => {
    return satisfies(nodeVersion, "<7.0.0")
      ? "string"
      : typeof binding.util.arrow_message_private_symbol
  })

  setDeferred(shared, "statValues", () => {
    return shared.support.getStatValues
      ? binding.fs.getStatValues()
      : new Float64Array(14)
  })

  setDeferred(support, "arrowSymbol", () => {
    return binding.util.arrow_message_private_symbol !== void 0
  })

  setDeferred(support, "await", () => {
    return satisfies(nodeVersion, ">=7.6.0")
  })

  setDeferred(support, "decoratedSymbol", () => {
    return binding.util.decorated_private_symbol !== void 0
  })

  setDeferred(support, "getHiddenValue", () => {
    return typeof binding.util.getHiddenValue === "function"
  })

  setDeferred(support, "getStatValues", () => {
    return typeof binding.fs.getStatValues === "function"
  })

  setDeferred(support, "internalModuleReadFile", () => {
    return typeof binding.fs.internalModuleReadFile === "function"
  })

  setDeferred(support, "internalModuleReadJSON", () => {
    return typeof binding.fs.internalModuleReadJSON === "function"
  })

  setDeferred(support, "setHiddenValue", () => {
    return typeof binding.util.setHiddenValue === "function"
  })
}

export default shared
