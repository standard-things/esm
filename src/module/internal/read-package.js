import SafeJSON from "../../safe/json.js"

import isObject from "../../util/is-object.js"
import readFile from "../../fs/read-file.js"
import { sep } from "../../safe/path.js"
import shared from "../../shared.js"
import toString from "../../util/to-string.js"

function init() {
  const mainFieldRegExp = /"main"/

  function readPackage(dirPath, fields) {
    const cache = shared.memoize.moduleInternalReadPackage
    const fieldsLength = fields === void 0 ? 0 : fields.length

    let cacheKey = dirPath + "\0"

    if (fieldsLength > 0) {
      cacheKey += fieldsLength === 1 ? fields[0] : fields.join()
    }

    let cached = cache.get(cacheKey)

    if (cached !== void 0) {
      return cached
    }

    const jsonPath = dirPath + sep + "package.json"
    const jsonContent = readFile(jsonPath, "utf8")

    if (jsonContent === null ||
        jsonContent === "" ||
        (fieldsLength === 1 &&
         fields[0] === "main" &&
         ! mainFieldRegExp.test(jsonContent))) {
      return null
    }

    try {
      const result = SafeJSON.parse(jsonContent)

      if (isObject(result)) {
        cache.set(cacheKey, result)

        return result
      }
    } catch (e) {
      e.path = jsonPath
      e.message = "Error parsing " + jsonPath + ": " + toString(e.message)
      throw e
    }

    return null
  }

  return readPackage
}

export default shared.inited
  ? shared.module.moduleInternalReadPackage
  : shared.module.moduleInternalReadPackage = init()
