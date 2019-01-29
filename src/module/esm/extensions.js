import SafeJSON from "../../safe/json.js"

import { readFileSync } from "../../safe/fs.js"
import safeProcess from "../../safe/process.js"
import toString from "../../util/to-string.js"
import stripBOM from "../../util/strip-bom.js"
import toNamespacedPath from "../../path/to-namespaced-path.js"

const extensions = { __proto__: null }

extensions[".js"] = function (mod, filename) {
  mod._compile(stripBOM(readFileSync(filename, "utf8")), filename)
}

extensions[".json"] = function (mod, filename) {
  const content = readFileSync(filename, "utf8")

  try {
    mod.exports = SafeJSON.parse(content)
  } catch (e) {
    e.message = filename + ": " + toString(e.message)

    throw e
  }
}

extensions[".node"] = function (mod, filename) {
  return safeProcess.dlopen(mod, toNamespacedPath(filename))
}

export default extensions
