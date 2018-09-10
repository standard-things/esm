import GenericArray from "../../generic/array.js"
import SafeJSON from "../../safe/json.js"

import readFileFast from "../../fs/read-file-fast.js"
import { sep } from "../../safe/path.js"
import shared from "../../shared.js"
import toString from "../../util/to-string.js"

const mainFieldRegExp = /"main"/

function readPackage(dirPath, fields) {
  const cache = shared.memoize.moduleInternalReadPackage
  const fieldsLength = fields ? fields.length : 0

  let cacheKey = dirPath

  if (fields) {
    cacheKey += "\0" + (fieldsLength === 1 ? fields[0] : GenericArray.join(fields))
  }

  if (Reflect.has(cache, cacheKey)) {
    return cache[cacheKey]
  }

  const jsonPath = dirPath + sep + "package.json"
  const jsonString = readFileFast(jsonPath, "utf8")

  if (! jsonString ||
      (fieldsLength === 1 &&
       fields[0] === "main" &&
       ! mainFieldRegExp.test(jsonString))) {
    return null
  }

  try {
    return cache[cacheKey] = SafeJSON.parse(jsonString)
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + toString(e.message)
    throw e
  }
}

export default readPackage
