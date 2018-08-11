import SafeJSON from "../../safe/json.js"

import readFileFast from "../../fs/read-file-fast.js"
import { resolve } from "../../safe/path.js"
import toString from "../../util/to-string.js"
import shared from "../../shared.js"

const mainFieldRegExp = /"main"/

function readPackage(dirPath) {
  const cache = shared.memoize.moduleInternalReadPackage

  if (Reflect.has(cache, dirPath)) {
    return cache[dirPath]
  }

  const jsonPath = resolve(dirPath, "package.json")
  const jsonString = readFileFast(jsonPath, "utf8")

  if (! jsonString ||
      ! mainFieldRegExp.test(jsonString)) {
    return null
  }

  try {
    return cache[dirPath] = SafeJSON.parse(jsonString)
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + toString(e.message)
    throw e
  }
}

export default readPackage
