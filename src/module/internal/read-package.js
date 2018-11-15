import GenericArray from "../../generic/array.js"
import GenericObject from "../../generic/object.js"
import SafeJSON from "../../safe/json.js"

import readFileFast from "../../fs/read-file-fast.js"
import { sep } from "../../safe/path.js"
import shared from "../../shared.js"
import toString from "../../util/to-string.js"

function init() {
  const mainFieldRegExp = /"main"/

  function readPackage(dirPath, fields) {
    const cache = shared.memoize.moduleInternalReadPackage
    const fieldsLength = fields ? fields.length : 0

    let cacheKey = dirPath

    if (fieldsLength > 0) {
      cacheKey += "\0" + (fieldsLength === 1 ? fields[0] : GenericArray.join(fields))
    }

    let cached = cache.get(cacheKey)

    if (cached !== void 0) {
      return cached
    }

    const jsonPath = dirPath + sep + "package.json"
    const jsonString = readFileFast(jsonPath, "utf8") || ""

    if (jsonString === "" ||
        (fieldsLength === 1 &&
        fields[0] === "main" &&
        ! mainFieldRegExp.test(jsonString))) {
      return null
    }

    try {
      cached =
        SafeJSON.parse(jsonString) ||
        GenericObject.create()
    } catch (e) {
      e.path = jsonPath
      e.message = "Error parsing " + jsonPath + ": " + toString(e.message)
      throw e
    }

    cache.set(cacheKey, cached)
    return cached
  }

  return readPackage
}

export default shared.inited
  ? shared.module.moduleInternalReadPackage
  : shared.module.moduleInternalReadPackage = init()
